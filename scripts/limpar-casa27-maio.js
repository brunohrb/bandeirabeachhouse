/**
 * Remove TODOS os registros de Casa 2.7 para maio/2026.
 * Casa 2.7 estava em reforma em maio — nenhuma reserva válida.
 * Rodar UMA VEZ via GitHub Actions.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('SUPABASE_URL e SUPABASE_ANON_KEY sao obrigatorios');
    process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    // Buscar o unidade_id de Casa 2.7
    const { data: unidades } = await db.from('unidades').select('id, nome');
    const casa27 = unidades.find(u => u.nome.includes('2.7'));
    if (!casa27) { console.log('Casa 2.7 não encontrada nas unidades.'); return; }
    console.log(`🏠 Casa 2.7 encontrada: id=${casa27.id}`);

    // Ver quantos registros existem em maio
    const { data: registros } = await db.from('reservas')
        .select('id, id_reserva, status, receita, hospede')
        .eq('unidade_id', casa27.id)
        .eq('mes_ano', '2026-05');

    if (!registros || registros.length === 0) {
        console.log('✅ Nenhum registro de Casa 2.7 em maio/2026 — nada a fazer.');
        return;
    }

    console.log(`🔍 ${registros.length} registro(s) encontrado(s) em maio/2026:`);
    registros.forEach(r => console.log(`   id_reserva=${r.id_reserva} | status=${r.status} | receita=${r.receita} | hospede=${r.hospede}`));

    // Deletar todos
    const { error } = await db.from('reservas')
        .delete()
        .eq('unidade_id', casa27.id)
        .eq('mes_ano', '2026-05');

    if (error) throw new Error('Erro ao deletar: ' + error.message);
    console.log(`🗑️  ${registros.length} registros de Casa 2.7 maio/2026 removidos.`);
    console.log('✅ Concluído!');
}

main().catch(err => { console.error('❌ Erro:', err.message); process.exit(1); });
