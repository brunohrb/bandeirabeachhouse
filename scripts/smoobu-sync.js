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
    const anoAtual   = new Date().getFullYear();
    const anoProximo = anoAtual + 1;
    const reservas = [];
    let page       = 1;
    let totalPages = 1;

    console.log(`📅 Buscando reservas de ${anoAtual}-01-01 a ${anoProximo}-12-31`);

    while (page <= totalPages) {
        const params = new URLSearchParams({
            pageSize: 100, page,
            arrivalFrom: `${anoAtual}-01-01`,
            arrivalTo:   `${anoProximo}-12-31`,
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

            // Log detalhado da primeira reserva para debug de campos
            if (data.reservations?.length > 0) {
                const sample = data.reservations[0];
                console.log('🔍 Campos da API:', Object.keys(sample).join(', '));
                console.log('🔍 Exemplo — id:', sample.id,
                    '| arrival:', sample.arrival,
                    '| type:', sample.type,
                    '| price:', sample.price,
                    '| commission:', sample.commission,
                    '| apartment:', JSON.stringify(sample.apartment));
            }

            // Se a API retorna um campo diferente de "reservations"
            if (!data.reservations && data.bookings) {
                console.log('⚠️ API retornou "bookings" em vez de "reservations" — usando bookings');
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

    return {
        idReserva: String(r.id).trim(), unidade: nomeUnidade,
        ano, mes, mesAno: `${ano}-${mes}`,
        receita, comissao, comissaoPortais: comissao, comissaoShortStay: 0,
        status: isCancelled ? 'cancelada' : 'ativa'
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

    const mapaUnidades = {};
    unidades.forEach(u => { mapaUnidades[u.nome] = u.id; });
    console.log(`🏠 Unidades (${unidades.length}): ${unidades.map(u => u.nome).join(', ')}`);

    // 3. Preparar dados para inserção (antes de deletar!)
    const paraInserir = reservasNovas
        .map(r => ({
            id: randomUUID(), id_reserva: r.idReserva,
            unidade_id: mapaUnidades[r.unidade],
            ano: r.ano, mes: r.mes, mes_ano: r.mesAno,
            receita: r.receita, comissao_portais: r.comissao ?? 0,
            comissao_short_stay: r.comissaoShortStay ?? 0, status: r.status ?? 'ativa'
        }))
        .filter(r => r.unidade_id);

    const ignoradas = reservasNovas.length - paraInserir.length;
    if (ignoradas > 0) {
        const nomes = [...new Set(reservasNovas.filter(r => !mapaUnidades[r.unidade]).map(r => r.unidade))];
        console.log(`⚠️ ${ignoradas} ignoradas (sem mapeamento): ${nomes.join(', ')}`);
    }

    // Proteção extra: só deletar se temos dados para inserir
    if (paraInserir.length === 0) {
        console.log('⚠️ Nenhuma reserva mapeada para unidades conhecidas. Nada alterado.');
        return;
    }

    // 4. Deletar reservas antigas (agora sabemos que temos dados novos)
    const anoAtual = new Date().getFullYear();
    const anoProximo = anoAtual + 1;
    console.log(`🗑️ Apagando reservas de ${anoAtual} e ${anoProximo}...`);

    for (const u of unidades) {
        const [{ data: d1 }, { data: d2 }] = await Promise.all([
            db.from('reservas').delete().eq('unidade_id', u.id).eq('ano', String(anoAtual)).select(),
            db.from('reservas').delete().eq('unidade_id', u.id).eq('ano', String(anoProximo)).select()
        ]);
        const t = (d1?.length ?? 0) + (d2?.length ?? 0);
        if (t > 0) console.log(`  🗑️ ${t} apagadas de "${u.nome}"`);
    }

    // 5. Inserir em lotes
    console.log(`📝 ${paraInserir.length} para inserir`);
    for (let i = 0; i < paraInserir.length; i += 500) {
        const lote = paraInserir.slice(i, i + 500);
        const { error: e } = await db.from('reservas').insert(lote);
        if (e) throw new Error('Erro inserir lote: ' + e.message);
        console.log(`  ✅ ${Math.min(i + 500, paraInserir.length)}/${paraInserir.length}`);
    }

    console.log(`🎉 Concluído! ${paraInserir.length} reservas sincronizadas.`);
}

main().catch(err => { console.error('❌ Erro fatal:', err.message); process.exit(1); });
