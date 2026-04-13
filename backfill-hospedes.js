/**
 * Backfill: Preencher campos hospede/chegada/partida/canal nas reservas antigas do Supabase
 *
 * Busca reservas de 2023-2026 da API do Smoobu e atualiza os registros no Supabase
 * que estão com o campo "hospede" vazio.
 *
 * Executar: node scripts/backfill-hospedes.js
 * Requer: SMOOBU_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY como env vars
 */

const { createClient } = require('@supabase/supabase-js');

const SMOOBU_API_KEY = process.env.SMOOBU_API_KEY;
const SUPABASE_URL   = process.env.SUPABASE_URL;
const SUPABASE_KEY   = process.env.SUPABASE_ANON_KEY;

if (!SMOOBU_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Variáveis de ambiente ausentes: SMOOBU_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY');
    process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchSmoobuReservations(from, to) {
    let all = [];
    let page = 1;
    let totalPages = 1;

    do {
        const params = new URLSearchParams({
            pageSize: '100', page: String(page),
            arrivalFrom: from, arrivalTo: to,
            showCancellation: 'true',
        });

        const res = await fetch(`https://login.smoobu.com/api/reservations?${params}`, {
            headers: { 'Api-Key': SMOOBU_API_KEY, 'Cache-Control': 'no-cache' }
        });

        if (!res.ok) {
            console.error(`❌ Smoobu API ${res.status}: ${await res.text()}`);
            break;
        }

        const data = await res.json();
        const items = data.reservations || data.bookings || [];
        totalPages = data.page_count || 1;

        items.forEach(r => {
            if (!r.id) return;
            const arrival = r.arrival || r['check-in'] || '';
            const departure = r.departure || r['check-out'] || '';
            if (!arrival) return;

            const hospede = (r['guest-name'] || r.guestName || r.guest_name || r.firstname || '').trim();
            const canal = (r.channel?.name || r['channel-name'] || r.channelName || '').trim() || 'Direto';
            const adultos = parseInt(r.adults || 0) || 0;
            const criancas = parseInt(r.children || 0) || 0;

            all.push({
                id_reserva: String(r.id).trim(),
                hospede: hospede || null,
                chegada: arrival || null,
                partida: departure || null,
                canal: canal,
                num_hospedes: (adultos + criancas) || 1,
            });
        });

        console.log(`  Página ${page}/${totalPages}: ${items.length} reservas`);
        page++;
        await sleep(500);
    } while (page <= totalPages);

    return all;
}

async function main() {
    console.log('🚀 Backfill hospedes iniciado:', new Date().toISOString());

    // 1. Buscar reservas sem hospede no Supabase
    const { data: semHospede, error: err1 } = await db
        .from('reservas')
        .select('id_reserva, hospede, chegada, mes_ano')
        .or('hospede.is.null,hospede.eq.')
        .order('mes_ano', { ascending: false });

    if (err1) {
        console.error('❌ Erro ao buscar reservas sem hospede:', err1.message);
        return;
    }

    console.log(`📋 ${semHospede.length} reservas sem hospede no Supabase`);
    if (semHospede.length === 0) {
        console.log('✅ Todas as reservas já têm hospede preenchido!');
        return;
    }

    // Criar set de IDs sem hospede
    const idsSemHospede = new Set(semHospede.map(r => r.id_reserva));

    // 2. Buscar reservas do Smoobu (2023 a 2026)
    console.log('\n📡 Buscando reservas do Smoobu (2023-2027)...');
    let todasSmoobu = [];

    for (const ano of [2023, 2024, 2025, 2026, 2027]) {
        console.log(`\n📅 Ano ${ano}:`);
        const reservas = await fetchSmoobuReservations(`${ano}-01-01`, `${ano}-12-31`);
        todasSmoobu = todasSmoobu.concat(reservas);
        console.log(`  Total: ${reservas.length} reservas`);
        await sleep(1000);
    }

    console.log(`\n📊 Total Smoobu: ${todasSmoobu.length} reservas`);

    // 3. Atualizar registros no Supabase
    let atualizados = 0;
    let erros = 0;
    let naoEncontrados = 0;

    for (const r of todasSmoobu) {
        if (!r.id_reserva || !r.hospede) continue;
        if (!idsSemHospede.has(r.id_reserva)) continue;

        const updates = {};
        if (r.hospede) updates.hospede = r.hospede;
        if (r.chegada) updates.chegada = r.chegada;
        if (r.partida) updates.partida = r.partida;
        if (r.canal) updates.canal = r.canal;
        if (r.num_hospedes) updates.num_hospedes = r.num_hospedes;

        if (Object.keys(updates).length === 0) continue;

        const { error } = await db
            .from('reservas')
            .update(updates)
            .eq('id_reserva', r.id_reserva);

        if (error) {
            erros++;
            if (erros <= 3) console.error(`  ❌ Erro ${r.id_reserva}:`, error.message);
        } else {
            atualizados++;
            if (atualizados <= 10) {
                console.log(`  ✅ ${r.id_reserva}: ${r.hospede} (${r.chegada} → ${r.partida}) [${r.canal}]`);
            }
        }
    }

    console.log(`\n🏁 Backfill concluído!`);
    console.log(`  ✅ ${atualizados} reservas atualizadas`);
    console.log(`  ❌ ${erros} erros`);
    console.log(`  ⏭️ ${semHospede.length - atualizados - erros} não encontradas no Smoobu`);
}

main().catch(e => {
    console.error('❌ Erro fatal:', e);
    process.exit(1);
});
