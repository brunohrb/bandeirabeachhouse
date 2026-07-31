/**
 * Fix completo junho/2026
 *
 * Para cada reserva do BookingList (Excel):
 *   - Se NÃO existe no banco → INSERT
 *   - Se existe mas comissao=0 e planilha tem comissão → UPDATE
 *
 * Não apaga nada. Seguro para rodar mais de uma vez.
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

const RESERVAS = [
    {"id_reserva":"145140446","unidade":"Apto 201-H","chegada":"2026-06-28","partida":"2026-06-29","ano":"2026","mes":"06","mes_ano":"2026-06","receita":238.11,"comissao":30.95,"hospede":"Aline Bruno","num_hospedes":3,"canal":"Booking.com","status":"ativa"},
    {"id_reserva":"144655891","unidade":"Apto 103-F","chegada":"2026-06-24","partida":"2026-06-25","ano":"2026","mes":"06","mes_ano":"2026-06","receita":150,"comissao":0,"hospede":"Beatriz","num_hospedes":1,"canal":"Direto","status":"ativa"},
    {"id_reserva":"144523846","unidade":"Apto 201-H","chegada":"2026-06-29","partida":"2026-07-02","ano":"2026","mes":"06","mes_ano":"2026-06","receita":677.97,"comissao":88.14,"hospede":"Alexandre Freire","num_hospedes":4,"canal":"Booking.com","status":"ativa"},
    {"id_reserva":"144351961","unidade":"Apto 201-H","chegada":"2026-06-23","partida":"2026-06-25","ano":"2026","mes":"06","mes_ano":"2026-06","receita":358.56,"comissao":46.61,"hospede":"ELIEZER GABRIEL DA SILVA JÚNIOR","num_hospedes":4,"canal":"Booking.com","status":"ativa"},
    {"id_reserva":"144002551","unidade":"Casa 2.5","chegada":"2026-06-19","partida":"2026-06-21","ano":"2026","mes":"06","mes_ano":"2026-06","receita":3000,"comissao":0,"hospede":"Pedro Gustavo","num_hospedes":1,"canal":"Direto","status":"ativa"},
    {"id_reserva":"143850996","unidade":"Apto 103-F","chegada":"2026-06-25","partida":"2026-06-27","ano":"2026","mes":"06","mes_ano":"2026-06","receita":430.92,"comissao":56.02,"hospede":"Antônio Alves de Assis Junior","num_hospedes":4,"canal":"Booking.com","status":"ativa"},
    {"id_reserva":"143734913","unidade":"Apto 201-H","chegada":"2026-06-21","partida":"2026-06-22","ano":"2026","mes":"06","mes_ano":"2026-06","receita":252.11,"comissao":32.77,"hospede":"Fernando Henrique","num_hospedes":2,"canal":"Booking.com","status":"ativa"},
    {"id_reserva":"143514011","unidade":"Apto 103-F","chegada":"2026-06-15","partida":"2026-06-17","ano":"2026","mes":"06","mes_ano":"2026-06","receita":366.12,"comissao":47.6,"hospede":"Iara Florentino","num_hospedes":3,"canal":"Booking.com","status":"ativa"},
    {"id_reserva":"143372921","unidade":"Apto 103-F","chegada":"2026-06-17","partida":"2026-06-19","ano":"2026","mes":"06","mes_ano":"2026-06","receita":476,"comissao":86.69,"hospede":"Leandro Sousa","num_hospedes":4,"canal":"Airbnb","status":"ativa"},
    {"id_reserva":"143185476","unidade":"Casa 2.5","chegada":"2026-06-13","partida":"2026-06-14","ano":"2026","mes":"06","mes_ano":"2026-06","receita":549.18,"comissao":71.39,"hospede":"kindeli talvegue","num_hospedes":12,"canal":"Booking.com","status":"ativa"},
    {"id_reserva":"142951972","unidade":"Apto 201-H","chegada":"2026-06-15","partida":"2026-06-16","ano":"2026","mes":"06","mes_ano":"2026-06","receita":200,"comissao":0,"hospede":"Socorro ribeiro","num_hospedes":1,"canal":"Direto","status":"ativa"},
    {"id_reserva":"142906122","unidade":"Apto 102-C","chegada":"2026-06-10","partida":"2026-06-12","ano":"2026","mes":"06","mes_ano":"2026-06","receita":641.52,"comissao":83.4,"hospede":"Cássio Penafiel Acosta","num_hospedes":2,"canal":"Booking.com","status":"ativa"},
    {"id_reserva":"142734722","unidade":"Apto 103-F","chegada":"2026-06-09","partida":"2026-06-11","ano":"2026","mes":"06","mes_ano":"2026-06","receita":330.48,"comissao":42.96,"hospede":"Raquel Oliveira","num_hospedes":2,"canal":"Booking.com","status":"ativa"},
    {"id_reserva":"142694342","unidade":"Apto 201-H","chegada":"2026-06-12","partida":"2026-06-13","ano":"2026","mes":"06","mes_ano":"2026-06","receita":318.38,"comissao":41.39,"hospede":"Jhuly Caracas","num_hospedes":2,"canal":"Booking.com","status":"ativa"},
    {"id_reserva":"142608427","unidade":"Apto 201-H","chegada":"2026-06-08","partida":"2026-06-10","ano":"2026","mes":"06","mes_ano":"2026-06","receita":330.48,"comissao":42.96,"hospede":"Filipe Nery","num_hospedes":2,"canal":"Booking.com","status":"ativa"},
    {"id_reserva":"142479257","unidade":"Apto 201-H","chegada":"2026-06-13","partida":"2026-06-14","ano":"2026","mes":"06","mes_ano":"2026-06","receita":286.54,"comissao":37.25,"hospede":"Jefferson Oliveira","num_hospedes":2,"canal":"Booking.com","status":"ativa"},
    {"id_reserva":"142223537","unidade":"Apto 201-H","chegada":"2026-06-11","partida":"2026-06-12","ano":"2026","mes":"06","mes_ano":"2026-06","receita":252.11,"comissao":32.77,"hospede":"Raulino Emanuel","num_hospedes":2,"canal":"Booking.com","status":"ativa"},
    {"id_reserva":"141938597","unidade":"apto 104 -G","chegada":"2026-06-02","partida":"2026-06-03","ano":"2026","mes":"06","mes_ano":"2026-06","receita":224.1,"comissao":29.13,"hospede":"José tarcisio Neto","num_hospedes":2,"canal":"Booking.com","status":"ativa"},
    {"id_reserva":"141919177","unidade":"Apto 201-H","chegada":"2026-06-02","partida":"2026-06-03","ano":"2026","mes":"06","mes_ano":"2026-06","receita":224.1,"comissao":29.13,"hospede":"Daniele Andrade","num_hospedes":2,"canal":"Booking.com","status":"ativa"},
    {"id_reserva":"141797137","unidade":"Apto 201-H","chegada":"2026-06-07","partida":"2026-06-08","ano":"2026","mes":"06","mes_ano":"2026-06","receita":252.11,"comissao":32.77,"hospede":"silva luzerene","num_hospedes":4,"canal":"Booking.com","status":"ativa"},
    {"id_reserva":"141685192","unidade":"Apto 102-C","chegada":"2026-06-05","partida":"2026-06-08","ano":"2026","mes":"06","mes_ano":"2026-06","receita":2322,"comissao":422.9,"hospede":"Josenilda Moreira","num_hospedes":1,"canal":"Airbnb","status":"ativa"},
    {"id_reserva":"141684467","unidade":"apto 104 -G","chegada":"2026-06-19","partida":"2026-06-21","ano":"2026","mes":"06","mes_ano":"2026-06","receita":458.46,"comissao":59.6,"hospede":"Francisca Maria","num_hospedes":2,"canal":"Booking.com","status":"ativa"},
    {"id_reserva":"141598657","unidade":"Apto 201-H","chegada":"2026-05-31","partida":"2026-06-01","ano":"2026","mes":"05","mes_ano":"2026-05","receita":216.11,"comissao":28.09,"hospede":"Júlio César Medeiros Xavier","num_hospedes":2,"canal":"Booking.com","status":"ativa"},
    {"id_reserva":"141418687","unidade":"Apto 103-F","chegada":"2026-06-07","partida":"2026-06-08","ano":"2026","mes":"06","mes_ano":"2026-06","receita":252.11,"comissao":32.77,"hospede":"junior andre","num_hospedes":2,"canal":"Booking.com","status":"ativa"},
    {"id_reserva":"141397267","unidade":"Apto 103-F","chegada":"2026-06-29","partida":"2026-07-01","ano":"2026","mes":"06","mes_ano":"2026-06","receita":403.38,"comissao":52.44,"hospede":"Jonh Felipe Araujo Da Silva","num_hospedes":2,"canal":"Booking.com","status":"ativa"},
    {"id_reserva":"141278017","unidade":"Apto 201-H","chegada":"2026-06-20","partida":"2026-06-21","ano":"2026","mes":"06","mes_ano":"2026-06","receita":300,"comissao":0,"hospede":"Noeme","num_hospedes":1,"canal":"Direto","status":"ativa"},
    {"id_reserva":"141050027","unidade":"apto 104 -G","chegada":"2026-06-15","partida":"2026-06-18","ano":"2026","mes":"06","mes_ano":"2026-06","receita":571.47,"comissao":74.29,"hospede":"Maria Gabrielle","num_hospedes":4,"canal":"Booking.com","status":"ativa"},
    {"id_reserva":"141018637","unidade":"apto 104 -G","chegada":"2026-05-31","partida":"2026-06-01","ano":"2026","mes":"05","mes_ano":"2026-05","receita":220,"comissao":0,"hospede":"Léo complemento","num_hospedes":1,"canal":"Direto","status":"ativa"},
    {"id_reserva":"140813287","unidade":"apto 104 -G","chegada":"2026-06-12","partida":"2026-06-14","ano":"2026","mes":"06","mes_ano":"2026-06","receita":540,"comissao":98.34,"hospede":"Espedito Pinheiro","num_hospedes":2,"canal":"Airbnb","status":"ativa"},
    {"id_reserva":"140546877","unidade":"Apto 103-F","chegada":"2026-06-20","partida":"2026-06-22","ano":"2026","mes":"06","mes_ano":"2026-06","receita":456.39,"comissao":59.33,"hospede":"Antonio Pedro Olavo Lima Soares","num_hospedes":2,"canal":"Booking.com","status":"ativa"},
    {"id_reserva":"140462057","unidade":"Apto 201-H","chegada":"2026-06-17","partida":"2026-06-19","ano":"2026","mes":"06","mes_ano":"2026-06","receita":403.38,"comissao":52.44,"hospede":"matheus garcia","num_hospedes":2,"canal":"Booking.com","status":"ativa"},
    {"id_reserva":"140265877","unidade":"Apto 103-F","chegada":"2026-06-04","partida":"2026-06-07","ano":"2026","mes":"06","mes_ano":"2026-06","receita":685.81,"comissao":89.16,"hospede":"Fabio Leite","num_hospedes":2,"canal":"Booking.com","status":"ativa"},
    {"id_reserva":"140115172","unidade":"apto 104 -G","chegada":"2026-06-04","partida":"2026-06-07","ano":"2026","mes":"06","mes_ano":"2026-06","receita":778,"comissao":141.7,"hospede":"Juan Dos Santos Mota Bezerra","num_hospedes":2,"canal":"Airbnb","status":"ativa"},
    {"id_reserva":"139760097","unidade":"Apto 103-F","chegada":"2026-06-27","partida":"2026-06-29","ano":"2026","mes":"06","mes_ano":"2026-06","receita":456.39,"comissao":59.33,"hospede":"Giselle Cysne","num_hospedes":2,"canal":"Booking.com","status":"ativa"},
    {"id_reserva":"139569227","unidade":"Apto 103-F","chegada":"2026-05-30","partida":"2026-06-01","ano":"2026","mes":"05","mes_ano":"2026-05","receita":531.36,"comissao":69.08,"hospede":"rodrigues Estefany","num_hospedes":2,"canal":"Booking.com","status":"ativa"},
    {"id_reserva":"139533117","unidade":"Apto 102-C","chegada":"2026-06-12","partida":"2026-06-15","ano":"2026","mes":"06","mes_ano":"2026-06","receita":1400,"comissao":0,"hospede":"Yohanna Ferreira forte","num_hospedes":1,"canal":"Direto","status":"ativa"},
    {"id_reserva":"139236717","unidade":"Apto 201-H","chegada":"2026-06-04","partida":"2026-06-07","ano":"2026","mes":"06","mes_ano":"2026-06","receita":653.55,"comissao":84.96,"hospede":"Danilo Marques moura","num_hospedes":2,"canal":"Booking.com","status":"ativa"},
    {"id_reserva":"139058402","unidade":"Apto 103-F","chegada":"2026-06-12","partida":"2026-06-14","ano":"2026","mes":"06","mes_ano":"2026-06","receita":500,"comissao":0,"hospede":"Gessica Maria Ferreira Souza","num_hospedes":4,"canal":"Direto","status":"ativa"},
    {"id_reserva":"136742237","unidade":"apto 104 -G","chegada":"2026-06-24","partida":"2026-07-04","ano":"2026","mes":"06","mes_ano":"2026-06","receita":2010,"comissao":0,"hospede":"Rozania Pereira","num_hospedes":1,"canal":"Direto","status":"ativa"},
    {"id_reserva":"135516757","unidade":"Casa 2.5","chegada":"2026-06-04","partida":"2026-06-07","ano":"2026","mes":"06","mes_ano":"2026-06","receita":3000,"comissao":0,"hospede":"Germano","num_hospedes":1,"canal":"Direto","status":"ativa"},
];

function normalizarNome(nome) {
    return (nome || '').toLowerCase().replace(/\s+/g, ' ').replace(/\s*-\s*/g, '-').trim();
}

function encontrarUnidadeId(nomeExcel, mapaExato, mapaNorm, unidades) {
    if (mapaExato[nomeExcel]) return mapaExato[nomeExcel];
    const norm = normalizarNome(nomeExcel);
    if (mapaNorm[norm]) return mapaNorm[norm];
    const numMatch = nomeExcel.match(/(\d+(?:\.\d+)?)/);
    if (numMatch) {
        const num = numMatch[1];
        const found = unidades.find(u => {
            const uNum = u.nome.match(/(\d+(?:\.\d+)?)/);
            return uNum && uNum[1] === num;
        });
        if (found) return found.id;
    }
    return null;
}

async function main() {
    console.log('🚀 Fix junho/2026 iniciado:', new Date().toISOString());

    const { data: unidades, error: errUn } = await db.from('unidades').select('id, nome');
    if (errUn) throw new Error('Erro unidades: ' + errUn.message);

    const mapaExato = {};
    const mapaNorm = {};
    unidades.forEach(u => {
        mapaExato[u.nome] = u.id;
        mapaNorm[normalizarNome(u.nome)] = u.id;
    });
    console.log('🏠 Unidades:', unidades.map(u => u.nome).join(', '));

    const todosIds = RESERVAS.map(r => r.id_reserva);
    const existentesMap = {};
    for (let i = 0; i < todosIds.length; i += 100) {
        const lote = todosIds.slice(i, i + 100);
        const { data: rows } = await db.from('reservas')
            .select('id_reserva, comissao_portais')
            .in('id_reserva', lote);
        (rows || []).forEach(r => { existentesMap[r.id_reserva] = r.comissao_portais; });
    }

    console.log(`\n📋 ${Object.keys(existentesMap).length}/${RESERVAS.length} reservas já existem no banco`);

    const paraInserir = [];
    const paraAtualizar = [];

    for (const r of RESERVAS) {
        const unidade_id = encontrarUnidadeId(r.unidade, mapaExato, mapaNorm, unidades);
        if (!unidade_id) { console.log(`⚠️ Sem mapeamento: ${r.unidade}`); continue; }

        if (!(r.id_reserva in existentesMap)) {
            paraInserir.push({
                id: randomUUID(), id_reserva: r.id_reserva, unidade_id,
                ano: r.ano, mes: r.mes, mes_ano: r.mes_ano,
                receita: r.receita, comissao_portais: r.comissao, comissao_short_stay: 0,
                status: r.status, hospede: r.hospede, chegada: r.chegada,
                partida: r.partida, num_hospedes: r.num_hospedes, canal: r.canal,
            });
        } else if (existentesMap[r.id_reserva] === 0 && r.comissao > 0) {
            paraAtualizar.push({ id_reserva: r.id_reserva, comissao: r.comissao });
        }
    }

    console.log(`📥 ${paraInserir.length} para inserir (faltavam no banco)`);
    console.log(`✏️ ${paraAtualizar.length} para atualizar comissão`);

    if (paraInserir.length > 0) {
        const { error: insErr } = await db.from('reservas').insert(paraInserir);
        if (insErr) throw new Error('Erro ao inserir: ' + insErr.message);
        paraInserir.forEach(r => console.log(`  ✅ INSERT ${r.id_reserva} | ${r.chegada} | R$ ${r.receita}`));
    }

    for (const r of paraAtualizar) {
        const { error: updErr } = await db.from('reservas')
            .update({ comissao_portais: r.comissao })
            .eq('id_reserva', r.id_reserva).eq('comissao_portais', 0);
        if (updErr) console.log(`  ❌ Erro ${r.id_reserva}: ${updErr.message}`);
        else console.log(`  ✅ UPDATE comissão ${r.id_reserva} → R$ ${r.comissao}`);
    }

    console.log('\n🎉 Concluído!');
    console.log(`   📥 ${paraInserir.length} reservas inseridas`);
    console.log(`   ✏️  ${paraAtualizar.length} comissões corrigidas`);
}

main().catch(err => { console.error('❌ Erro fatal:', err.message); process.exit(1); });
