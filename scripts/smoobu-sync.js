/**
 * Smoobu → Supabase Daily Sync
 *
 * Usa a API JSON do Smoobu (não o download XLSX do browser).
 * Roda via GitHub Actions (ver .github/workflows/smoobu-sync.yml)
 */

const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const SMOOBU_API_KEY = process.env.SMOOBU_API_KEY;
const SUPABASE_URL   = process.env.SUPABASE_URL;
const SUPABASE_KEY   = process.env.SUPABASE_ANON_KEY;

if (!SMOOBU_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Variáveis de ambiente ausentes: SMOOBU_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY');
    process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

/* ───── helpers ───── */

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Normaliza nome de unidade para comparação flexível.
 * Ex: "apto 104 -G" → "apto 104-g"
 *     "Apto 103-F"  → "apto 103-f"
 *     "Casa 2.7"    → "casa 2.7"
 */
function normalizarNome(nome) {
    return (nome || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')   // múltiplos espaços → 1
        .replace(/\s*-\s*/g, '-') // espaço ao redor de traço
        .trim();
}

/**
 * Encontra o unidade_id no Supabase que melhor corresponde ao nome do Smoobu.
 * 1) Tenta match exato
 * 2) Tenta match normalizado (case-insensitive, espaços)
 * 3) Tenta match pelo número da unidade (ex: "103" contido no nome)
 */
function encontrarUnidadeId(nomeSmoobu, mapaExato, mapaNormalizado, unidades) {
    // 1) Exato
    if (mapaExato[nomeSmoobu]) return mapaExato[nomeSmoobu];

    // 2) Normalizado
    const norm = normalizarNome(nomeSmoobu);
    if (mapaNormalizado[norm]) return mapaNormalizado[norm];

    // 3) Extrair número/identificador e tentar match parcial
    // "Apto 103-F" → procura unidade que contenha "103"
    // "Casa 2.7"   → procura unidade que contenha "2.7"
    const numMatch = nomeSmoobu.match(/(\d+(?:\.\d+)?)/);
    if (numMatch) {
        const num = numMatch[1];
        const found = unidades.find(u => {
            const uNum = u.nome.match(/(\d+(?:\.\d+)?)/);
            return uNum && uNum[1] === num;
        });
        if (found) return found.id;
    }

    return null;
}

/**
 * Fetch com retry + exponential backoff.
 * Tenta até `retries` vezes com delays de 2s, 4s, 8s…
 */
async function fetchWithRetry(url, opts, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const res = await fetch(url, opts);

            // Se recebeu 429 (rate-limit), espera e tenta de novo
            if (res.status === 429 && attempt < retries) {
                const wait = 2000 * Math.pow(2, attempt - 1);
                console.log(`⏳ Rate-limit (429), aguardando ${wait / 1000}s…`);
                await sleep(wait);
                continue;
            }

            return res;
        } catch (err) {
            if (attempt === retries) throw err;
            const wait = 2000 * Math.pow(2, attempt - 1);
            console.log(`⚠️ Tentativa ${attempt}/${retries} falhou (${err.message}), aguardando ${wait / 1000}s…`);
            await sleep(wait);
        }
    }
}

/* ───── fetch reservas ───── */

async function fetchSmoobuReservations() {
    const hoje       = new Date();
    const anoAtual   = hoje.getFullYear();
    const mesAtual   = String(hoje.getMonth() + 1).padStart(2, '0');
    const anoProximo = anoAtual + 1;
    const reservas = [];
    let page       = 1;
    let totalPages = 1;

    // Busca do mês ANTERIOR em diante — garante que reservas com check-in no final do mês
    // passado (ex: 30/abr com saída em maio) sejam contabilizadas no mês correto (check-in).
    const mesAnterior = hoje.getMonth() === 0 ? 12 : hoje.getMonth(); // getMonth() é 0-based
    const anoAnterior = hoje.getMonth() === 0 ? anoAtual - 1 : anoAtual;
    const mesAnteriorStr = String(mesAnterior).padStart(2, '0');
    const fromDate = `${anoAnterior}-${mesAnteriorStr}-01`;
    const toDate   = `${anoProximo}-12-31`;
    console.log(`📅 Buscando reservas de ${fromDate} a ${toDate} (inclui mês anterior para check-ins de virada de mês)`);

    while (page <= totalPages) {
        const params = new URLSearchParams({
            pageSize: 100, page,
            arrivalFrom: fromDate,
            arrivalTo:   toDate,
            showCancellation: true,
        });

        const response = await fetchWithRetry(
            `https://login.smoobu.com/api/reservations?${params}`,
            { headers: { 'Api-Key': SMOOBU_API_KEY, 'Cache-Control': 'no-cache' } }
        );

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Smoobu API ${response.status}: ${text.slice(0, 500)}`);
        }

        const data = await response.json();

        if (page === 1) {
            totalPages = data.page_count ?? 1;
            console.log(`📊 ${data.total_items ?? '?'} reservas (${totalPages} página(s))`);

            // Se a API retorna um campo diferente de "reservations"
            if (!data.reservations && data.bookings) {
                console.log('⚠️ API retornou "bookings" em vez de "reservations" — usando bookings');
            }

            // Log detalhado da primeira reserva para debug de campos
            const items0 = data.reservations ?? data.bookings ?? [];
            if (items0.length > 0) {
                const sample = items0[0];
                console.log('🔍 Campos da API:', Object.keys(sample).join(', '));
                console.log('🔍 Exemplo — id:', sample.id,
                    '| arrival:', sample.arrival,
                    '| type:', sample.type,
                    '| price:', sample.price,
                    '| commission:', sample.commission,
                    '| apartment:', JSON.stringify(sample.apartment));
            }
        }

        const items = data.reservations ?? data.bookings ?? [];
        reservas.push(...items);
        console.log(`  📄 Página ${page}/${totalPages}: ${items.length} reservas`);
        page++;
    }

    return reservas;
}

/* ───── processamento ───── */

function processReservation(r) {
    if (!r.id) return null;
    const arrivalStr = r.arrival ?? r['check-in'] ?? r.checkIn;
    if (!arrivalStr) return null;
    const [ano, mes] = arrivalStr.split('-');
    if (!ano || !mes) return null;

    const isCancelled = r.type === 'cancellation' || r.type === 'cancelled' ||
        String(r.status ?? '').toLowerCase().includes('cancel');

    const receita  = parseFloat(r.totalPrice ?? r.total_price ?? r.price ?? r.amount ?? 0) || 0;
    const comissao = parseFloat(r.commission ?? r.channelCommission ?? r['commission-amount'] ?? 0) || 0;
    const nomeUnidade = (r.apartment?.name ?? r.unit?.name ?? r.property?.name ?? 'N/A').trim();

    // Dados extras para reservas futuras / mensagem de limpeza
    const hospede = (r['guest-name'] ?? r.guestName ?? r.guest_name ?? r.firstname ?? '').trim() || null;
    const chegada = arrivalStr || null; // YYYY-MM-DD
    const partida = (r.departure ?? r['check-out'] ?? r.checkOut ?? '').trim() || null;
    const adultos = parseInt(r.adults ?? r.adultos ?? 0) || 0;
    const criancas = parseInt(r.children ?? r.criancas ?? 0) || 0;
    const numHospedes = (adultos + criancas) || 1;

    // Canal/portal de origem (Booking.com, Airbnb, etc.)
    const canal = (r.channel?.name ?? r['channel-name'] ?? r.channelName ?? '').trim() || 'Direto';

    return {
        idReserva: String(r.id).trim(), unidade: nomeUnidade,
        ano, mes, mesAno: `${ano}-${mes}`,
        receita, comissao, comissaoPortais: comissao, comissaoShortStay: 0,
        status: isCancelled ? 'cancelada' : 'ativa',
        hospede, chegada, partida, numHospedes, canal
    };
}

/* ───── main ───── */

async function main() {
    console.log('🚀 Smoobu Sync iniciado:', new Date().toISOString());

    // 1. Buscar reservas da API
    const smoobuRaw     = await fetchSmoobuReservations();
    const reservasNovas = smoobuRaw.map(processReservation).filter(Boolean);
    console.log(`✅ ${reservasNovas.length} reservas válidas de ${smoobuRaw.length} brutas`);

    // Proteção: se API retornou 0 reservas, pode ser erro — não apagar dados
    if (reservasNovas.length === 0) {
        console.log('⚠️ ATENÇÃO: Nenhuma reserva retornada pela API.');
        console.log('   Isso pode indicar problema com a API key ou parâmetros.');
        console.log('   Dados existentes NÃO foram apagados por segurança.');
        return;
    }

    // 2. Buscar unidades do Supabase
    const { data: unidades, error: errUn } = await db
        .from('unidades').select('id, nome').not('nome', 'ilike', '%Movi%');
    if (errUn) throw new Error('Erro unidades: ' + errUn.message);

    // Mapas para matching flexível de nomes
    const mapaExato = {};
    const mapaNormalizado = {};
    unidades.forEach(u => {
        mapaExato[u.nome] = u.id;
        mapaNormalizado[normalizarNome(u.nome)] = u.id;
    });
    console.log(`🏠 Unidades Supabase (${unidades.length}): ${unidades.map(u => u.nome).join(', ')}`);

    // Log dos nomes Smoobu para comparação
    const nomesSmoobu = [...new Set(reservasNovas.map(r => r.unidade))];
    console.log(`🏠 Unidades Smoobu (${nomesSmoobu.length}): ${nomesSmoobu.join(', ')}`);

    // 3. Preparar dados para inserção (antes de deletar!)
    function montarRegistro(r, comDetalhes) {
        const base = {
            id: randomUUID(), id_reserva: r.idReserva,
            unidade_id: encontrarUnidadeId(r.unidade, mapaExato, mapaNormalizado, unidades),
            ano: r.ano, mes: r.mes, mes_ano: r.mesAno,
            receita: r.receita, comissao_portais: r.comissao ?? 0,
            comissao_short_stay: r.comissaoShortStay ?? 0, status: r.status ?? 'ativa'
        };
        if (comDetalhes) {
            base.hospede = r.hospede;
            base.chegada = r.chegada;
            base.partida = r.partida;
            base.num_hospedes = r.numHospedes;
            base.canal = r.canal;
        }
        return base;
    }

    let usarDetalhes = true;
    const paraInserir = reservasNovas
        .map(r => montarRegistro(r, true))
        .filter(r => r.unidade_id);

    const ignoradas = reservasNovas.length - paraInserir.length;
    if (ignoradas > 0) {
        const nomes = [...new Set(reservasNovas.filter(r =>
            !encontrarUnidadeId(r.unidade, mapaExato, mapaNormalizado, unidades)
        ).map(r => r.unidade))];
        console.log(`⚠️ ${ignoradas} ignoradas (sem mapeamento): ${nomes.join(', ')}`);
    }

    // Proteção extra: só deletar se temos dados para inserir
    if (paraInserir.length === 0) {
        console.log('⚠️ Nenhuma reserva mapeada para unidades conhecidas. Nada alterado.');
        return;
    }

    // 4. Deletar APENAS os id_reserva específicos que vamos reinserir.
    // Isso garante que dados históricos (meses anteriores) nunca são tocados,
    // pois a API do Smoobu só retorna reservas do mês atual em diante.
    console.log(`🗑️ Apagando ${paraInserir.length} reservas que serão reinseridas...`);

    for (const u of unidades) {
        const idsUni = paraInserir
            .filter(r => r.unidade_id === u.id)
            .map(r => r.id_reserva);
        if (idsUni.length === 0) continue;

        // Deletar em lotes de 200 (limite do IN clause)
        for (let i = 0; i < idsUni.length; i += 200) {
            const loteIds = idsUni.slice(i, i + 200);
            const { data: deleted } = await db.from('reservas').delete()
                .eq('unidade_id', u.id)
                .in('id_reserva', loteIds)
                .select();
            const t = deleted?.length ?? 0;
            if (t > 0) console.log(`  🗑️ ${t} apagadas de "${u.nome}"`);
        }
    }

    // 5. Inserir em lotes (tenta com detalhes, se falhar tenta sem)
    console.log(`📝 ${paraInserir.length} para inserir`);

    async function inserirLotes(dados) {
        for (let i = 0; i < dados.length; i += 500) {
            const lote = dados.slice(i, i + 500);
            const { error: e } = await db.from('reservas').insert(lote);
            if (e) throw e;
            console.log(`  ✅ ${Math.min(i + 500, dados.length)}/${dados.length}`);
        }
    }

    try {
        await inserirLotes(paraInserir);
    } catch (e) {
        if (e.message && e.message.includes('column') && usarDetalhes) {
            console.log('⚠️ Colunas extras (hospede/chegada/partida) não existem no Supabase. Inserindo sem elas...');
            const semDetalhes = reservasNovas
                .map(r => montarRegistro(r, false))
                .filter(r => r.unidade_id);
            await inserirLotes(semDetalhes);
        } else {
            throw new Error('Erro inserir lote: ' + e.message);
        }
    }

    console.log(`🎉 Concluído! ${paraInserir.length} reservas sincronizadas.`);
}

main().catch(err => { console.error('❌ Erro fatal:', err.message); process.exit(1); });
