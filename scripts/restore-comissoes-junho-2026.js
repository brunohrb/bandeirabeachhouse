/**
 * Restaurar comissões de junho/2026 a partir do BookingList exportado do Smoobu.
 * SEGURO: só faz UPDATE onde comissao_portais=0. Não apaga nada.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Variáveis de ambiente ausentes: SUPABASE_URL, SUPABASE_ANON_KEY');
    process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// Comissões extraídas do BookingList20260731_2.xlsx (todas as unidades, junho/2026)
const COMISSOES = {
    "139236717": 84.96,
    "139569227": 69.08,
    "139760097": 59.33,
    "140115172": 141.7,
    "140265877": 89.16,
    "140462057": 52.44,
    "140546877": 59.33,
    "140813287": 98.34,
    "141050027": 74.29,
    "141397267": 52.44,
    "141418687": 32.77,
    "141598657": 28.09,
    "141684467": 59.6,
    "141685192": 422.9,
    "141797137": 32.77,
    "141919177": 29.13,
    "141938597": 29.13,
    "142223537": 32.77,
    "142479257": 37.25,
    "142608427": 42.96,
    "142694342": 41.39,
    "142734722": 42.96,
    "142906122": 83.4,
    "143185476": 71.39,
    "143372921": 86.69,
    "143514011": 47.6,
    "143734913": 32.77,
    "143850996": 56.02,
    "144351961": 46.61,
    "144523846": 88.14,
    "145140446": 30.95,
};

async function main() {
    console.log('🚀 Restore comissões junho/2026 iniciado:', new Date().toISOString());
    console.log(`📋 ${Object.keys(COMISSOES).length} reservas com comissão no mapa`);

    let atualizados = 0;
    let jaCorreta = 0;
    let naoEncontrado = 0;

    for (const [id_reserva, comissao] of Object.entries(COMISSOES)) {
        const { data: rows, error: errSel } = await db.from('reservas')
            .select('id_reserva, comissao_portais')
            .eq('id_reserva', id_reserva);

        if (errSel) { console.log(`⚠️ Erro ao buscar ${id_reserva}:`, errSel.message); continue; }

        if (!rows || rows.length === 0) {
            naoEncontrado++;
            console.log(`  ⚠️ Não encontrado no banco: ${id_reserva}`);
            continue;
        }

        const atual = rows[0].comissao_portais;
        if (atual > 0) {
            jaCorreta++;
            continue;
        }

        const { error: updErr } = await db.from('reservas')
            .update({ comissao_portais: comissao })
            .eq('id_reserva', id_reserva)
            .eq('comissao_portais', 0);

        if (updErr) {
            console.log(`  ❌ Erro ao atualizar ${id_reserva}:`, updErr.message);
        } else {
            atualizados++;
            console.log(`  ✅ ${id_reserva} → R$ ${comissao}`);
        }
    }

    console.log(`\n🎉 Concluído!`);
    console.log(`   ✅ ${atualizados} comissões restauradas`);
    console.log(`   ℹ️ ${jaCorreta} já estavam corretas`);
    console.log(`   ⚠️ ${naoEncontrado} não encontradas no banco`);
}

main().catch(err => { console.error('❌ Erro fatal:', err.message); process.exit(1); });
