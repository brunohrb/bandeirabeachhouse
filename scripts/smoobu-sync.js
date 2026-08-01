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

function normalizarNome(nome) {
    return (nome || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/\s*-\s*/g, '-')
        .trim();
}

function encontrarUnidadeId(nomeSmoobu, mapaExato, mapaNormalizado, unidades) {
    if (mapaExato[nomeSmoobu]) return mapaExato[nomeSmoobu];

    const norm = normalizarNome(nomeSmoobu);
    if (mapaNormalizado[norm]) return mapaNormalizado[norm];

    const numMatch = nomeSmoobu.match(/(\d+(?:\.\d+)?)/)
    if (numMatch) {
        const num = numMatch[1];
        const found = unidades.find(u => {
            const uNum = u.nome.match(/(\d+(?:\.\d+)?)/)
            return uNum && uNum[1] === num;
        });
        if (found) return found.id;
    }

    return null;
}

async function fetchWithRetry(url, opts, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const res = await fetch(url, opts);

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
    const anoProximo = anoAtual + 1;
    const reservas = [];
    let page       = 1;
    let totalPages = 1;

    const fromDate = `${anoAtual}-01-01`;
    const toDate   = `${anoProximo}-12-31`;
    console.log(`📅 Buscando reservas de ${fromDate} a ${toDate}`);

    while (page <= totalPages) {
        const params = new URLSearchParams({
            pageSize: 100, page,
            arrivalFrom: fromDate,
            arrivalTo:   toDate,
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
            console.log(`📊 ${data.total_items ?? '?'} reservas brutas (${totalPages} página(s))`);

            if (!data.reservations && data.bookings) {
                console.log('⚠️ API retornou "bookings" em vez de "reservations" — usando bookings');
            }

            const items0 = data.reservations ?? data.bookings ?? [];
            if (items0.length > 0) {
                const sample = items0.find(r => r.type === 'booking' && (r.price ?? 0) > 0) ?? items0[0];
                console.log('🔍 Exemplo (type:', sample.type, ') — id:', sample.id,
                    '| arrival:', sample.arrival,
                    '| price:', sample.price,
                    '| commission-included:', sample['commission-included'],
                    '| apartment:', JSON.stringify(sample.apartment));
            }
        }

        const items = data.reservations ?? data.bookings ?? [];
        reservas.push(...items);
        console.log(`  📄 Página ${page}/${totalPages}: ${items.length} registros`);
        page++;
    }

    return reservas;
}

/* ───── processamento ───── */

function processReservation(r) {
    if (!r.id) return null;

    // Ignorar registros de modificação — têm price:0 e commission:null,
    // corrompem receita e comissão do registro original.
    const tipo = String(r.type ?? '').toLowerCase();
    if (tipo.includes('modification')) return null;

    const arrivalStr = r.arrival ?? r['check-in'] ?? r.checkIn;
    if (!arrivalStr) return null;
    const [ano, mes] = arrivalStr.split('-');
    if (!ano || !mes) return null;

    const isCancelled = tipo === 'cancellation' || tipo === 'cancelled' ||
        String(r.status ?? '').toLowerCase().includes('cancel');

    const receita  = parseFloat(r.totalPrice ?? r.total_price ?? r.price ?? r.amount ?? 0) || 0;
    const pd = r['price-details'] ?? {};
    const comissao = parseFloat(
        r['commission-included'] ??
        pd.commission ?? pd.channelCommission ?? pd['channel-commission'] ??
        pd.hostCommission ?? pd['host-commission'] ??
        r.commission ?? r.channelCommission ?? r['commission-amount'] ?? 0
    ) || 0;
    const nomeUnidade = (r.apartment?.name ?? r.unit?.name ?? r.property?.name ?? 'N/A').trim();

    const hospede = (r['guest-name'] ?? r.guestName ?? r.guest_name ?? r.firstname ?? '').trim() || null;
    const chegada = arrivalStr || null;
    const partida = (r.departure ?? r['check-out'] ?? r.checkOut ?? '').trim() || null;
    const adultos = parseInt(r.adults ?? r.adultos ?? 0) || 0;
    const criancas = parseInt(r.children ?? r.criancas ?? 0) || 0;
    const numHospedes = (adultos + criancas) || 1;

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
    const hoje = new Date();

    const smoobuRaw     = await fetchSmoobuReservations();
    const reservasNovas = smoobuRaw.map(processReservation).filter(Boolean);

    // Log de tipos ignorados
    const ignoradosTipo = smoobuRaw.filter(r => String(r.type ?? '').toLowerCase().includes('modification')).length;
    console.log(`✅ ${reservasNovas.length} reservas válidas (${ignoradosTipo} modificações ignoradas de ${smoobuRaw.length} brutas)`);

    const comComissao = reservasNovas.filter(r => r.comissao > 0);
    console.log(`💰 ${comComissao.length}/${reservasNovas.length} reservas com comissão > 0`);
    if (comComissao.length > 0) {
        comComissao.slice(0, 3).forEach(r =>
            console.log(`   ✅ ${r.unidade} | ${r.chegada} | canal: ${r.canal} | receita: ${r.receita} | comissao: ${r.comissao}`)
        );
    }

    if (reservasNovas.length === 0) {
        console.log('⚠️ ATENÇÃO: Nenhuma reserva retornada pela API. Dados existentes NÃO foram apagados.');
        return;
    }

    const { data: unidades, error: errUn } = await db
        .from('unidades').select('id, nome').not('nome', 'ilike', '%Movi%');
    if (errUn) throw new Error('Erro unidades: ' + errUn.message);

    const mapaExato = {};
    const mapaNormalizado = {};
    unidades.forEach(u => {
        mapaExato[u.nome] = u.id;
        mapaNormalizado[normalizarNome(u.nome)] = u.id;
    });
    console.log(`🏠 Unidades: ${unidades.map(u => u.nome).join(', ')}`);

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

    if (paraInserir.length === 0) {
        console.log('⚠️ Nenhuma reserva mapeada. Nada alterado.');
        return;
    }

    // Separar passado (meses fechados) do presente/futuro
    // Meses passados: NUNCA deletar — só inserir se ainda não existir no banco.
    // Mês atual + futuro: DELETE→INSERT normal (com preservação de comissão).
    const primeiroDiaMesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
    const passado     = paraInserir.filter(r => r.chegada < primeiroDiaMesAtual);
    const presenteFut = paraInserir.filter(r => r.chegada >= primeiroDiaMesAtual);
    console.log(`📆 ${passado.length} reservas em meses fechados (só insert se faltando) | ${presenteFut.length} mês atual/futuro (delete+insert)`);

    async function inserirLotes(dados) {
        for (let i = 0; i < dados.length; i += 500) {
            const lote = dados.slice(i, i + 500);
            const { error: e } = await db.from('reservas').insert(lote);
            if (e) throw e;
            console.log(`  ✅ ${Math.min(i + 500, dados.length)}/${dados.length}`);
        }
    }

    // ── Meses passados: inserir apenas os que faltam ──
    if (passado.length > 0) {
        const idsPassado = passado.map(r => r.id_reserva);
        const jaExistem = new Set();
        for (let i = 0; i < idsPassado.length; i += 200) {
            const lote = idsPassado.slice(i, i + 200);
            const { data: ex } = await db.from('reservas').select('id_reserva').in('id_reserva', lote);
            (ex ?? []).forEach(r => jaExistem.add(r.id_reserva));
        }
        const faltando = passado.filter(r => !jaExistem.has(r.id_reserva));
        console.log(`📥 Meses fechados: ${jaExistem.size} já existem, ${faltando.length} para inserir`);
        if (faltando.length > 0) {
            try {
                await inserirLotes(faltando);
            } catch (e) {
                if (e.message && e.message.includes('column')) {
                    console.log('⚠️ Colunas extras não existem. Inserindo sem elas...');
                    const semDet = faltando.map(r => {
                        const { hospede, chegada, partida, num_hospedes, canal, ...base } = r;
                        return base;
                    });
                    await inserirLotes(semDet);
                } else {
                    throw new Error('Erro inserir passado: ' + e.message);
                }
            }
        }
    }

    // ── Mês atual + futuro: salvar comissões, deletar, reinserir ──
    if (presenteFut.length > 0) {
        const idsPresente = presenteFut.map(r => r.id_reserva);
        const comissoesExistentes = {};
        for (let i = 0; i < idsPresente.length; i += 200) {
            const lote = idsPresente.slice(i, i + 200);
            const { data: existentes } = await db.from('reservas')
                .select('id_reserva, comissao_portais')
                .in('id_reserva', lote)
                .gt('comissao_portais', 0);
            (existentes ?? []).forEach(r => { comissoesExistentes[r.id_reserva] = r.comissao_portais; });
        }
        const preservadas = Object.keys(comissoesExistentes).length;
        if (preservadas > 0) console.log(`💾 ${preservadas} comissões existentes salvas para preservação`);

        presenteFut.forEach(r => {
            if (!r.comissao_portais && comissoesExistentes[r.id_reserva]) {
                r.comissao_portais = comissoesExistentes[r.id_reserva];
            }
        });

        console.log(`🗑️ Apagando ${presenteFut.length} reservas do mês atual/futuro para reinserir...`);
        for (const u of unidades) {
            const idsUni = presenteFut.filter(r => r.unidade_id === u.id).map(r => r.id_reserva);
            if (idsUni.length === 0) continue;
            for (let i = 0; i < idsUni.length; i += 200) {
                const loteIds = idsUni.slice(i, i + 200);
                const { data: deleted } = await db.from('reservas').delete()
                    .eq('unidade_id', u.id).in('id_reserva', loteIds).select();
                const t = deleted?.length ?? 0;
                if (t > 0) console.log(`  🗑️ ${t} apagadas de "${u.nome}"`);
            }
        }

        console.log(`📝 ${presenteFut.length} para inserir (mês atual/futuro)`);
        try {
            await inserirLotes(presenteFut);
        } catch (e) {
            if (e.message && e.message.includes('column')) {
                console.log('⚠️ Colunas extras não existem. Inserindo sem elas...');
                const semDet = presenteFut.map(r => {
                    const { hospede, chegada, partida, num_hospedes, canal, ...base } = r;
                    return base;
                });
                await inserirLotes(semDet);
            } else {
                throw new Error('Erro inserir lote: ' + e.message);
            }
        }
    }

    console.log(`🎉 Concluído! ${paraInserir.length} reservas processadas (${passado.length} histórico protegido + ${presenteFut.length} mês atual/futuro).`);
}

main().catch(err => { console.error('❌ Erro fatal:', err.message); process.exit(1); });
