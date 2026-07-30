/**
 * Restaurar comissões 2026 do Smoobu
 *
 * Busca reservas 2026 no Smoobu, tenta extrair comissão de todos os campos
 * possíveis, e atualiza apenas os registros com comissao_portais=0 no banco.
 *
 * SEGURO: não apaga nada, só faz UPDATE onde comissao_portais=0.
 * Roda via GitHub Actions (restore-comissoes.yml) — uma única vez.
 */

const { createClient } = require('@supabase/supabase-js');

const SMOOBU_API_KEY = process.env.SMOOBU_API_KEY;
const SUPABASE_URL   = process.env.SUPABASE_URL;
const SUPABASE_KEY   = process.env.SUPABASE_ANON_KEY;

if (!SMOOBU_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Variáveis de ambiente ausentes');
    process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchWithRetry(url, opts, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const res = await fetch(url, opts);
            if (res.status === 429 && attempt < retries) {
                const wait = 2000 * Math.pow(2, attempt - 1);
                console.log(`⏳ Rate-limit, aguardando ${wait / 1000}s…`);
                await sleep(wait);
                continue;
            }
            return res;
        } catch (err) {
            if (attempt === retries) throw err;
            const wait = 2000 * Math.pow(2, attempt - 1);
            console.log(`⚠️ Tentativa ${attempt} falhou, aguardando ${wait / 1000}s…`);
            await sleep(wait);
        }
    }
}

function extrairComissao(r) {
    const pd = r['price-details'] ?? {};

    const candidatos = {
        'commission-included': r['commission-included'],
        'pd.commission': pd.commission,
        'pd.channelCommission': pd.channelCommission,
        'pd.channel-commission': pd['channel-commission'],
        'pd.hostCommission': pd.hostCommission,
        'pd.host-commission': pd['host-commission'],
        'pd.guestServiceFee': pd.guestServiceFee,
        'pd.hostServiceFee': pd.hostServiceFee,
        'r.commission': r.commission,
        'r.commission-amount': r['commission-amount'],
    };

    for (const [campo, val] of Object.entries(candidatos)) {
        const n = parseFloat(val);
        if (n > 0) return { valor: n, campo };
    }

    return { valor: 0, campo: null };
}

async function fetchReservasSmoobu(fromDate, toDate) {
    const reservas = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
        const params = new URLSearchParams({
            pageSize: 100, page,
            arrivalFrom: fromDate,
            arrivalTo:   toDate,
        });

        const res = await fetchWithRetry(
            `https://login.smoobu.com/api/reservations?${params}`,
            { headers: { 'Api-Key': SMOOBU_API_KEY, 'Cache-Control': 'no-cache' } }
        );

        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`Smoobu ${res.status}: ${txt.slice(0, 300)}`);
        }

        const data = await res.json();
        if (page === 1) {
            totalPages = data.page_count ?? 1;
            console.log(`📊 ${data.total_items ?? '?'} reservas brutas (${totalPages} página(s))`);
        }

        const items = data.reservations ?? data.bookings ?? [];
        reservas.push(...items);
        console.log(`  📄 Página ${page}/${totalPages}: ${items.length} registros`);
        page++;
    }

    return reservas;
}

async function fetchDetalhesReserva(id) {
    const res = await fetchWithRetry(
        `https://login.smoobu.com/api/reservations/${id}`,
        { headers: { 'Api-Key': SMOOBU_API_KEY, 'Cache-Control': 'no-cache' } }
    );
    if (!res.ok) return null;
    return res.json();
}

async function main() {
    console.log('🚀 Restore comissões 2026 iniciado:', new Date().toISOString());

    const reservasRaw = await fetchReservasSmoobu('2026-01-01', '2026-12-31');

    const bookings = reservasRaw.filter(r => {
        const tipo = String(r.type ?? '').toLowerCase();
        return !tipo.includes('modification') && r.id;
    });

    console.log(`\n🔍 ${bookings.length} bookings reais encontrados`);

    const comComissaoLista = bookings.filter(r => extrairComissao(r).valor > 0);
    console.log(`💰 ${comComissaoLista.length} com comissão na listagem geral`);

    if (comComissaoLista.length > 0) {
        const ex = comComissaoLista[0];
        const { valor, campo } = extrairComissao(ex);
        console.log(`\n🔍 Exemplo com comissão — id: ${ex.id}, arrival: ${ex.arrival}`);
        console.log(`   commission-included: ${ex['commission-included']}`);
        console.log(`   price-details: ${JSON.stringify(ex['price-details'])}`);
        console.log(`   → campo usado: ${campo} = ${valor}`);
    }

    const semComissao = bookings.filter(r => extrairComissao(r).valor === 0);
    console.log(`\n🔎 ${semComissao.length} sem comissão na listagem — buscando detalhes individuais...`);

    const amostra = semComissao.filter(r => {
        const canal = (r.channel?.name ?? r['channel-name'] ?? '').toLowerCase();
        return canal.includes('booking') || canal.includes('airbnb') || canal.includes('expedia');
    }).slice(0, 5);

    for (const r of amostra) {
        await sleep(300);
        const det = await fetchDetalhesReserva(r.id);
        if (det) {
            console.log(`\n📋 Detalhe id ${r.id} (${r.arrival}, ${r.channel?.name}):`);
            console.log(`   commission-included: ${det['commission-included']}`);
            console.log(`   price-details: ${JSON.stringify(det['price-details'])}`);
            const { valor, campo } = extrairComissao(det);
            console.log(`   → comissão extraída: ${valor} (campo: ${campo})`);
        }
        await sleep(500);
    }

    console.log('\n📦 Buscando registros com comissao=0 no banco para 2026...');
    const { data: semComissaoDB, error: errDB } = await db.from('reservas')
        .select('id_reserva, unidade_id, mes_ano, canal')
        .eq('comissao_portais', 0)
        .gte('mes_ano', '2026-01')
        .lte('mes_ano', '2026-12')
        .not('id_reserva', 'like', 'MOVI_%')
        .not('id_reserva', 'like', 'manual-%');

    if (errDB) throw new Error('Erro DB: ' + errDB.message);
    console.log(`📋 ${semComissaoDB?.length ?? 0} reservas com comissao=0 no banco`);

    const mapaComissao = {};
    for (const r of bookings) {
        const { valor } = extrairComissao(r);
        if (valor > 0) mapaComissao[String(r.id)] = valor;
    }

    const idsSemMapa = (semComissaoDB ?? [])
        .filter(r => !mapaComissao[r.id_reserva])
        .map(r => r.id_reserva);

    console.log(`\n🔎 ${idsSemMapa.length} ids precisam de busca individual...`);

    let buscasFeitas = 0;
    for (const id of idsSemMapa) {
        await sleep(300);
        const det = await fetchDetalhesReserva(id);
        if (det) {
            const { valor } = extrairComissao(det);
            if (valor > 0) {
                mapaComissao[id] = valor;
                buscasFeitas++;
            }
        }

        if (buscasFeitas % 20 === 0 && buscasFeitas > 0) {
            console.log(`  🔄 ${buscasFeitas} comissões recuperadas via detalhe individual...`);
        }
    }

    console.log(`\n✅ ${Object.keys(mapaComissao).length} ids com comissão no mapa total`);

    const paraAtualizar = (semComissaoDB ?? []).filter(r => mapaComissao[r.id_reserva]);
    console.log(`📝 ${paraAtualizar.length} registros para atualizar no banco`);

    if (paraAtualizar.length === 0) {
        console.log('ℹ️ Nenhum registro para atualizar. O Smoobu não retornou comissão para reservas finalizadas.');
        console.log('   → Para restaurar dados históricos, é necessário exportar o BookingList do Smoobu (todas as unidades).');
        return;
    }

    let atualizados = 0;
    for (const r of paraAtualizar) {
        const { error: updErr } = await db.from('reservas')
            .update({ comissao_portais: mapaComissao[r.id_reserva] })
            .eq('id_reserva', r.id_reserva)
            .eq('comissao_portais', 0);

        if (updErr) {
            console.log(`  ⚠️ Erro ao atualizar ${r.id_reserva}: ${updErr.message}`);
        } else {
            atualizados++;
        }

        if (atualizados % 20 === 0 && atualizados > 0) {
            console.log(`  ✅ ${atualizados}/${paraAtualizar.length} atualizados...`);
        }
    }

    console.log(`\n🎉 Concluído! ${atualizados} reservas com comissão restaurada.`);
}

main().catch(err => { console.error('❌ Erro fatal:', err.message); process.exit(1); });
