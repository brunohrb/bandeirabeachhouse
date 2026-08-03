/**
 * Fix Casa 2.5 — Junho + Julho 2026
 *
 * Sistema mostrava R$28.161,61 mas o correto (BookingList20260804.xlsx) é R$21.937,57.
 * Mesma qtd de registros (8), mas valores errados no banco.
 * Este script apaga tudo de Casa 2.5 / 2026-06 e 2026-07 e reinserve os corretos.
 */

const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Variáveis ausentes: SUPABASE_URL, SUPABASE_ANON_KEY');
    process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// Dados extraídos do BookingList20260804.xlsx — check-in em junho e julho
// Regra: mês = data de check-in (149274956 entra 31/07 → julho)
const RESERVAS_CORRETAS = [
    // ── Junho ──
    { id_reserva: "135516757", mes_ano: "2026-06", chegada: "2026-06-04", partida: "2026-06-07", hospede: "Germano",                    receita: 3000.00,  comissao: 0,      canal: "Direto",      num_hospedes: 1,  status: "ativa" },
    { id_reserva: "141787187", mes_ano: "2026-06", chegada: "2026-06-11", partida: "2026-06-12", hospede: "Rosangela Vai",              receita: 0,        comissao: 0,      canal: "Direto",      num_hospedes: 1,  status: "ativa" },
    { id_reserva: "143185476", mes_ano: "2026-06", chegada: "2026-06-13", partida: "2026-06-14", hospede: "kindeli talvegue",           receita: 549.18,   comissao: 71.39,  canal: "Booking.com", num_hospedes: 12, status: "ativa" },
    { id_reserva: "144002551", mes_ano: "2026-06", chegada: "2026-06-19", partida: "2026-06-21", hospede: "Pedro Gustavo",             receita: 3000.00,  comissao: 0,      canal: "Direto",      num_hospedes: 1,  status: "ativa" },
    // ── Julho ──
    { id_reserva: "144611256", mes_ano: "2026-07", chegada: "2026-07-04", partida: "2026-07-07", hospede: "Antônio Macedo Coelho neto", receita: 3800.00,  comissao: 0,      canal: "Direto",      num_hospedes: 1,  status: "ativa" },
    { id_reserva: "146389836", mes_ano: "2026-07", chegada: "2026-07-10", partida: "2026-07-15", hospede: "Douglas Ramos",             receita: 5359.59,  comissao: 803.94, canal: "Booking.com", num_hospedes: 8,  status: "ativa" },
    { id_reserva: "147620541", mes_ano: "2026-07", chegada: "2026-07-17", partida: "2026-07-19", hospede: "André Dantas",              receita: 3200.00,  comissao: 0,      canal: "Direto",      num_hospedes: 1,  status: "ativa" },
    { id_reserva: "149274956", mes_ano: "2026-07", chegada: "2026-07-31", partida: "2026-08-03", hospede: "sabrina bento",             receita: 3028.80,  comissao: 454.32, canal: "Booking.com", num_hospedes: 14, status: "ativa" },
];

async function main() {
    console.log('🚀 Fix Casa 2.5 junho+julho/2026 iniciado:', new Date().toISOString());

    const { data: unidades, error: errUn } = await db.from('unidades').select('id, nome');
    if (errUn) throw new Error('Erro unidades: ' + errUn.message);

    const unidade = unidades.find(u => u.nome.match(/2\.5/));
    if (!unidade) throw new Error('Unidade Casa 2.5 não encontrada. Disponíveis: ' + unidades.map(u => u.nome).join(', '));
    console.log(`🏠 Unidade: ${unidade.nome} (id: ${unidade.id})`);

    // Ver o que está no banco atualmente
    for (const mesAno of ['2026-06', '2026-07']) {
        const { data: atual } = await db.from('reservas')
            .select('id_reserva, chegada, receita, comissao_portais, canal, hospede')
            .eq('unidade_id', unidade.id).eq('mes_ano', mesAno).order('chegada');
        console.log(`\n📋 Banco atual ${mesAno} (${atual?.length ?? 0} registros):`);
        (atual ?? []).forEach(r => console.log(`  - ${r.id_reserva} | ${r.chegada} | R$${r.receita} | com=${r.comissao_portais} | ${r.canal} | ${r.hospede}`));
    }

    // Apagar junho e julho
    for (const mesAno of ['2026-06', '2026-07']) {
        const { error: errDel } = await db.from('reservas')
            .delete().eq('unidade_id', unidade.id).eq('mes_ano', mesAno);
        if (errDel) throw new Error(`Erro ao apagar ${mesAno}: ` + errDel.message);
        console.log(`\n🗑️ Apagados registros de ${mesAno}`);
    }

    // Inserir corretos
    const registros = RESERVAS_CORRETAS.map(r => ({
        id: randomUUID(),
        id_reserva: r.id_reserva,
        unidade_id: unidade.id,
        ano: r.mes_ano.split('-')[0],
        mes: r.mes_ano.split('-')[1],
        mes_ano: r.mes_ano,
        chegada: r.chegada,
        partida: r.partida,
        hospede: r.hospede,
        receita: r.receita,
        comissao_portais: r.comissao,
        comissao_short_stay: 0,
        canal: r.canal,
        num_hospedes: r.num_hospedes,
        status: r.status,
    }));

    const { error: errIns } = await db.from('reservas').insert(registros);
    if (errIns) throw new Error('Erro ao inserir: ' + errIns.message);

    console.log(`\n✅ ${registros.length} registros inseridos:`);
    registros.forEach(r => console.log(`  ✅ ${r.id_reserva} | ${r.chegada} | R$${r.receita} | com=${r.comissao_portais} | ${r.canal}`));

    const receitaJun = RESERVAS_CORRETAS.filter(r => r.mes_ano === '2026-06').reduce((s, r) => s + r.receita, 0);
    const receitaJul = RESERVAS_CORRETAS.filter(r => r.mes_ano === '2026-07').reduce((s, r) => s + r.receita, 0);
    const comJun = RESERVAS_CORRETAS.filter(r => r.mes_ano === '2026-06').reduce((s, r) => s + r.comissao, 0);
    const comJul = RESERVAS_CORRETAS.filter(r => r.mes_ano === '2026-07').reduce((s, r) => s + r.comissao, 0);

    console.log('\n🎉 Concluído!');
    console.log(`   Junho: receita R$${receitaJun.toFixed(2)} | comissão R$${comJun.toFixed(2)}`);
    console.log(`   Julho: receita R$${receitaJul.toFixed(2)} | comissão R$${comJul.toFixed(2)}`);
    console.log(`   Total: receita R$${(receitaJun + receitaJul).toFixed(2)} | comissão R$${(comJun + comJul).toFixed(2)}`);
}

main().catch(err => { console.error('❌ Erro fatal:', err.message); process.exit(1); });
