/**
 * Fix Casa 2.7 — Julho 2026
 *
 * O banco tem 4 registros para Casa 2.7/julho, mas o BookingList correto
 * (BookingList20260801_2.xlsx, check-in 01/07 a 31/07) mostra 3 reservas.
 * Este script apaga tudo de Casa 2.7/2026-07 e reinserve os 3 corretos.
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

// Dados corretos extraídos do BookingList20260801_2.xlsx (check-in 01/07 a 31/07)
const RESERVAS_CORRETAS = [
    {
        id_reserva: "139902027",
        chegada: "2026-07-10",
        partida: "2026-07-12",
        hospede: "proprietarios",
        receita: 0,
        comissao: 0,
        canal: "Direto",
        num_hospedes: 1,
        status: "ativa",
    },
    {
        id_reserva: "147305991",
        chegada: "2026-07-16",
        partida: "2026-07-20",
        hospede: "Brunna siqueira",
        receita: 6800,
        comissao: 0,
        canal: "Direto",
        num_hospedes: 1,
        status: "ativa",
    },
    {
        // check-in 31/07 → conta em julho pela regra da data de entrada
        id_reserva: "139656067",
        chegada: "2026-07-31",
        partida: "2026-08-02",
        hospede: "Mendes Wefelnberg Joelma",
        receita: 3152.70,
        comissao: 409.85,
        canal: "Booking.com",
        num_hospedes: 2,
        status: "ativa",
    },
];

async function main() {
    console.log('🚀 Fix Casa 2.7 julho/2026 iniciado:', new Date().toISOString());

    // Buscar unidade_id da Casa 2.7
    const { data: unidades, error: errUn } = await db.from('unidades').select('id, nome');
    if (errUn) throw new Error('Erro unidades: ' + errUn.message);

    const unidade = unidades.find(u => u.nome.match(/2\.7/));
    if (!unidade) throw new Error('Unidade Casa 2.7 não encontrada. Unidades disponíveis: ' + unidades.map(u => u.nome).join(', '));
    console.log(`🏠 Unidade encontrada: ${unidade.nome} (id: ${unidade.id})`);

    // Verificar o que está no banco atualmente
    const { data: atual, error: errAtual } = await db.from('reservas')
        .select('id_reserva, chegada, partida, receita, comissao_portais, canal, hospede')
        .eq('unidade_id', unidade.id)
        .eq('mes_ano', '2026-07')
        .order('chegada');
    if (errAtual) throw new Error('Erro ao buscar: ' + errAtual.message);

    console.log(`\n📋 Registros ATUAIS no banco (${atual?.length ?? 0}):`);
    (atual ?? []).forEach(r => console.log(`  - ${r.id_reserva} | ${r.chegada} | R$ ${r.receita} | ${r.canal} | ${r.hospede}`));

    // Apagar todos os registros de Casa 2.7 / julho 2026
    const { error: errDel } = await db.from('reservas')
        .delete()
        .eq('unidade_id', unidade.id)
        .eq('mes_ano', '2026-07');
    if (errDel) throw new Error('Erro ao apagar: ' + errDel.message);
    console.log(`\n🗑️ ${atual?.length ?? 0} registros apagados`);

    // Inserir os 3 corretos
    const registros = RESERVAS_CORRETAS.map(r => ({
        id: randomUUID(),
        id_reserva: r.id_reserva,
        unidade_id: unidade.id,
        ano: '2026',
        mes: '07',
        mes_ano: '2026-07',
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
    registros.forEach(r => console.log(`  ✅ ${r.id_reserva} | ${r.chegada} | R$ ${r.receita} | ${r.canal}`));

    console.log('\n🎉 Concluído! Casa 2.7 julho/2026 corrigida.');
    console.log('   Receita correta: R$ 9.952,70 | Comissão: R$ 409,85');
    console.log('   (R$ 6.800 Brunna + R$ 3.152,70 Joelma check-in 31/07 + R$ 0 proprietários)');
}

main().catch(err => { console.error('❌ Erro fatal:', err.message); process.exit(1); });
