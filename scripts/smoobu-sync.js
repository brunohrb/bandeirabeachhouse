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
            includeIntersecting: true
        });

        const response = await fetch(
            `https://login.smoobu.com/api/reservations?${params}`,
            { headers: { 'Api-Key': SMOOBU_API_KEY, 'Cache-Control': 'no-cache' } }
        );

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Smoobu API ${response.status}: ${text.slice(0, 300)}`);
        }

        const data = await response.json();

        if (page === 1) {
            totalPages = data.page_count ?? 1;
            console.log(`📊 ${data.total_items ?? '?'} reservas (${totalPages} página(s))`);
            if (data.reservations?.length > 0)
                console.log('🔍 Campos:', Object.keys(data.reservations[0]).join(', '));
        }

        reservas.push(...(data.reservations ?? []));
        console.log(`  📄 Página ${page}/${totalPages}: ${data.reservations?.length ?? 0} reservas`);
        page++;
    }

    return reservas;
}

function processReservation(r) {
    if (!r.id) return null;
    const arrivalStr = r.arrival;
    if (!arrivalStr) return null;
    const [ano, mes] = arrivalStr.split('-');
    if (!ano || !mes) return null;

    const isCancelled = r.type === 'cancellation' || r.type === 'cancelled' ||
        String(r.status ?? '').toLowerCase().includes('cancel');

    const receita  = parseFloat(r.totalPrice ?? r.total_price ?? r.price?.total ?? r.price ?? 0);
    const comissao = parseFloat(r.commission ?? r.channelCommission ?? r.price?.commission ?? 0);
    const nomeUnidade = (r.apartment?.name ?? r.unit?.name ?? r.property?.name ?? 'N/A').trim();

    return {
        idReserva: String(r.id).trim(), unidade: nomeUnidade,
        ano, mes, mesAno: `${ano}-${mes}`,
        receita, comissao, comissaoPortais: comissao, comissaoShortStay: 0,
        status: isCancelled ? 'cancelada' : 'ativa'
    };
}

async function main() {
    console.log('🚀 Smoobu Sync iniciado:', new Date().toISOString());

    const smoobuRaw     = await fetchSmoobuReservations();
    const reservasNovas = smoobuRaw.map(processReservation).filter(Boolean);
    console.log(`✅ ${reservasNovas.length} reservas válidas`);
    if (reservasNovas.length === 0) { console.log('⚠️ Nenhuma reserva.'); return; }

    const { data: unidades, error: errUn } = await db
        .from('unidades').select('id, nome').not('nome', 'ilike', '%Movi%');
    if (errUn) throw new Error('Erro unidades: ' + errUn.message);

    const mapaUnidades = {};
    unidades.forEach(u => { mapaUnidades[u.nome] = u.id; });
    console.log(`🏠 Unidades: ${unidades.map(u => u.nome).join(', ')}`);

    const anoAtual = new Date().getFullYear();
    const anoProximo = anoAtual + 1;
    console.log(`🗑️ Apagando ${anoAtual} e ${anoProximo}...`);

    for (const u of unidades) {
        const [{ data: d1 }, { data: d2 }] = await Promise.all([
            db.from('reservas').delete().eq('unidade_id', u.id).eq('ano', String(anoAtual)).select(),
            db.from('reservas').delete().eq('unidade_id', u.id).eq('ano', String(anoProximo)).select()
        ]);
        const t = (d1?.length ?? 0) + (d2?.length ?? 0);
        if (t > 0) console.log(`  🗑️ ${t} apagadas de "${u.nome}"`);
    }

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

    console.log(`📝 ${paraInserir.length} para inserir`);
    for (let i = 0; i < paraInserir.length; i += 500) {
        const lote = paraInserir.slice(i, i + 500);
        const { error: e } = await db.from('reservas').insert(lote);
        if (e) throw new Error('Erro inserir: ' + e.message);
        console.log(`  ✅ ${Math.min(i + 500, paraInserir.length)}/${paraInserir.length}`);
    }

    console.log(`🎉 Concluído! ${paraInserir.length} reservas sincronizadas.`);
}

main().catch(err => { console.error('❌ Erro fatal:', err.message); process.exit(1); });
