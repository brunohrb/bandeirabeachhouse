/**
 * Smoobu → Supabase Daily Sync
 *
 * Baixa o relatório XLSX do Smoobu e sincroniza com o Supabase do Beach House.
 * Roda via GitHub Actions (ver .github/workflows/smoobu-sync.yml)
 */

const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

// ─── Configuração ────────────────────────────────────────────────────────────
const SMOOBU_API_KEY  = process.env.SMOOBU_API_KEY;
const SUPABASE_URL    = process.env.SUPABASE_URL;
const SUPABASE_KEY    = process.env.SUPABASE_ANON_KEY;

if (!SMOOBU_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Variáveis de ambiente ausentes: SMOOBU_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY');
    process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── URL do Smoobu (mesmo padrão do app) ─────────────────────────────────────
function getSmoobuExcelUrl() {
    const anoAtual  = new Date().getFullYear();
    const anoProximo = anoAtual + 1;
    return (
        'https://login.smoobu.com/api/v2/users/670124/bookings/exports/xlsx' +
        '?sort=arrivalDate' +
        `&filter[arrivalDate][from]=${anoAtual}-01-01` +
        `&filter[arrivalDate][to]=${anoProximo}-12-31` +
        `&filter[departureDate][from]=${anoAtual}-01-01` +
        `&filter[departureDate][to]=${anoProximo}-12-31` +
        '&filter[includeIntersections]=true' +
        '&filter[excludeMockedBookings]=true' +
        '&filter[statuses][0]=1' +
        '&filter[statuses][1]=2'
    );
}

// ─── Parse de data (igual ao app) ────────────────────────────────────────────
function parseDataBR(valor) {
    if (!valor) return null;

    // Date object (xlsx com cellDates: true)
    if (valor instanceof Date && !isNaN(valor)) {
        const ano = valor.getFullYear();
        const mes = String(valor.getMonth() + 1).padStart(2, '0');
        return { ano: String(ano), mes, mesAno: `${ano}-${mes}` };
    }

    // String "dd/mm/yy" ou "dd/mm/yyyy"
    if (typeof valor === 'string') {
        const partes = valor.split('/');
        if (partes.length !== 3) return null;
        let mes = partes[1].padStart(2, '0');
        let ano = partes[2];
        if (ano.length === 2) {
            const n = parseInt(ano, 10);
            ano = n < 50 ? `20${ano}` : `19${ano}`;
        }
        return { ano, mes, mesAno: `${ano}-${mes}` };
    }

    return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log('🚀 Smoobu Sync iniciado:', new Date().toISOString());

    // 1. Baixa o XLSX do Smoobu
    const url = getSmoobuExcelUrl();
    console.log('📥 Baixando XLSX do Smoobu...');

    const response = await fetch(url, {
        headers: { 'Api-Key': SMOOBU_API_KEY }
    });

    if (!response.ok) {
        throw new Error(`Smoobu retornou ${response.status}: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    console.log(`✅ Arquivo baixado (${buffer.byteLength} bytes)`);

    // 2. Parseia o XLSX
    const workbook  = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheet     = workbook.Sheets[workbook.SheetNames[0]];
    const linhasExcel = XLSX.utils.sheet_to_json(sheet);

    if (linhasExcel.length === 0) {
        console.log('⚠️ Arquivo vazio, nada a sincronizar.');
        return;
    }

    const colunas = Object.keys(linhasExcel[0]);
    console.log(`📄 ${linhasExcel.length} linhas | colunas: ${colunas.slice(0, 6).join(', ')}`);

    // Detecta formato Smoobu (coluna "Posição")
    if (!colunas.includes('Posição') && !colunas.includes('Posicao')) {
        // Tenta inglês
        if (!colunas.includes('Position') && !colunas.includes('Booking ID')) {
            throw new Error(`Formato desconhecido. Colunas: ${colunas.join(', ')}`);
        }
    }

    // 3. Processa linhas → reservas
    const reservasNovas = linhasExcel.map(linha => {
        const idReserva = linha['Posição'] ?? linha['Posicao'] ?? linha['Position'] ?? linha['Booking ID'];
        if (!idReserva) return null;

        const data = parseDataBR(linha.Chegada ?? linha['Check-in'] ?? linha['Arrival']);
        if (!data) return null;

        const preco    = parseFloat(linha['Preço']   ?? linha['Price']   ?? 0);
        const comissao = parseFloat(linha['Comissão incluída'] ?? linha['Commission'] ?? 0);
        const estado   = String(linha['Estado'] ?? linha['Status'] ?? '').toLowerCase();
        const cancelada = estado.includes('cancelad') || estado.includes('cancelled') || estado.includes('canceled');

        const nomeUnidade = (linha['Alojamento'] ?? linha['Accommodation'] ?? 'N/A').trim();

        return {
            idReserva: String(idReserva).trim(),
            unidade:   nomeUnidade,
            ano:       data.ano,
            mes:       data.mes,
            mesAno:    data.mesAno,
            receita:   preco,
            comissao,
            comissaoPortais:   comissao,
            comissaoShortStay: 0,
            status: cancelada ? 'cancelada' : 'ativa'
        };
    }).filter(Boolean);

    console.log(`📊 ${reservasNovas.length} reservas válidas encontradas`);

    // 4. Busca unidades (exceto Movi) do Supabase
    const { data: unidades, error: errUn } = await db
        .from('unidades')
        .select('id, nome')
        .not('nome', 'ilike', '%Movi%');

    if (errUn) throw new Error('Erro ao buscar unidades: ' + errUn.message);

    const mapaUnidades = {};
    unidades.forEach(u => { mapaUnidades[u.nome] = u.id; });

    console.log(`🏠 Unidades (exceto Movi): ${unidades.map(u => u.nome).join(', ')}`);

    // 5. Apaga ano atual + próximo para unidades não-Movi
    const anoAtual   = new Date().getFullYear();
    const anoProximo = anoAtual + 1;

    console.log(`🗑️  Apagando reservas ${anoAtual} e ${anoProximo}...`);

    for (const unidade of unidades) {
        const [{ data: d1 }, { data: d2 }] = await Promise.all([
            db.from('reservas').delete().eq('unidade_id', unidade.id).eq('ano', String(anoAtual)).select(),
            db.from('reservas').delete().eq('unidade_id', unidade.id).eq('ano', String(anoProximo)).select()
        ]);
        const total = (d1?.length ?? 0) + (d2?.length ?? 0);
        if (total > 0) console.log(`  🗑️  ${total} apagadas de "${unidade.nome}"`);
    }

    // 6. Prepara registros para inserção
    const paraInserir = reservasNovas
        .map(r => ({
            id:                  randomUUID(),
            id_reserva:          r.idReserva,
            unidade_id:          mapaUnidades[r.unidade],
            ano:                 r.ano,
            mes:                 r.mes,
            mes_ano:             r.mesAno,
            receita:             r.receita,
            comissao_portais:    r.comissao ?? 0,
            comissao_short_stay: r.comissaoShortStay ?? 0,
            status:              r.status ?? 'ativa'
        }))
        .filter(r => r.unidade_id); // descarta unidades que não existem no banco

    const ignoradas = reservasNovas.length - paraInserir.length;
    if (ignoradas > 0) {
        const nomesIgnorados = [...new Set(
            reservasNovas
                .filter(r => !mapaUnidades[r.unidade])
                .map(r => r.unidade)
        )];
        console.log(`⚠️  ${ignoradas} reservas ignoradas (unidade não mapeada): ${nomesIgnorados.join(', ')}`);
    }

    console.log(`📝 ${paraInserir.length} reservas para inserir`);

    // 7. Insere em lotes de 500
    const BATCH = 500;
    for (let i = 0; i < paraInserir.length; i += BATCH) {
        const lote = paraInserir.slice(i, i + BATCH);
        const { error: errIns } = await db.from('reservas').insert(lote);
        if (errIns) throw new Error('Erro ao inserir lote: ' + errIns.message);
        console.log(`  ✅ ${Math.min(i + BATCH, paraInserir.length)}/${paraInserir.length} inseridas`);
    }

    console.log(`🎉 Sync concluído! ${paraInserir.length} reservas sincronizadas.`);
}

main().catch(err => {
    console.error('❌ Erro fatal:', err.message);
    process.exit(1);
});
