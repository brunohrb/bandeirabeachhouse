/**
 * Restaura dados de Abril/2026
 * Fonte: BookingList20260514_3.xlsx (49 registros, exportado do Smoobu)
 * Regra de negócio: mês contábil = mês do check-in
 *
 * Jean Castro (check-in 31/03) → mês MARÇO (não abril)
 * Todos os demais → mês ABRIL
 *
 * Uso via GitHub Actions: Actions → Restaurar Abril 2026 → Run workflow
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('SUPABASE_URL e SUPABASE_ANON_KEY sao obrigatorios');
    process.exit(1);
}

console.log('Supabase URL:', SUPABASE_URL.replace(/https?:\/\/([^.]+).*/, 'https://$1.supabase.co'));

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

function normalizarNome(nome) {
    if (!nome) return '';
    return nome.toLowerCase().replace(/\s+/g, ' ').trim();
}

function findUnidadeId(alojamento, unidades) {
    const norm = normalizarNome(alojamento);
    let u = unidades.find(u => normalizarNome(u.nome) === norm);
    if (u) return u.id;
    const num = alojamento.match(/(\d+(?:\.\d+)?)/);
    if (num) {
        u = unidades.find(u => u.nome.includes(num[1]));
        if (u) return u.id;
    }
    return null;
}

// 49 registros do BookingList20260514_3.xlsx
// Regra: mês contábil = mês do check-in
// Jean Castro (check-in 31/03) → mes_ano='2026-03' (mês MARÇO)
const DADOS = [
  // Jean Castro — check-in 31/03/26, saída 01/04 → MARÇO (regra: mês do check-in)
  {"id_reserva":"132569062","alojamento":"apto 104 -G","hospede":"Jean Castro","chegada":"2026-03-31","partida":"2026-04-01","ano":"2026","mes":"03","receita":302.18,"com":0,"num":1,"canal":"Direto"},
  // 48 reservas com check-in em ABRIL
  {"id_reserva":"137107992","alojamento":"apto 104 -G","hospede":"Lopes de Lima Cleciano","chegada":"2026-04-27","partida":"2026-04-28","ano":"2026","mes":"04","receita":286.54,"com":37.25,"num":1,"canal":"Direto"},
  {"id_reserva":"136864352","alojamento":"Apto 102-C","hospede":"Francisca izaudina","chegada":"2026-04-25","partida":"2026-04-27","ano":"2026","mes":"04","receita":1200,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"136774597","alojamento":"Apto 103-F","hospede":"Thaís Marques Bezerra","chegada":"2026-04-24","partida":"2026-04-25","ano":"2026","mes":"04","receita":216.11,"com":28.09,"num":1,"canal":"Direto"},
  {"id_reserva":"136464497","alojamento":"Casa 2.5","hospede":"Complemento patrick","chegada":"2026-04-26","partida":"2026-04-27","ano":"2026","mes":"04","receita":750,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"136366072","alojamento":"Apto 103-F","hospede":"Luciana Gadelha Miranda","chegada":"2026-04-21","partida":"2026-04-22","ano":"2026","mes":"04","receita":203.4,"com":26.44,"num":1,"canal":"Direto"},
  {"id_reserva":"136278567","alojamento":"Apto 201-H","hospede":"Adilane Braga","chegada":"2026-04-25","partida":"2026-04-26","ano":"2026","mes":"04","receita":346.5,"com":45.05,"num":1,"canal":"Direto"},
  {"id_reserva":"136241262","alojamento":"Apto 201-H","hospede":"Alan David","chegada":"2026-04-21","partida":"2026-04-22","ano":"2026","mes":"04","receita":254.25,"com":33.05,"num":1,"canal":"Direto"},
  {"id_reserva":"136196167","alojamento":"apto 104 -G","hospede":"JAQUELINE VASCONCELOS","chegada":"2026-04-21","partida":"2026-04-22","ano":"2026","mes":"04","receita":201.72,"com":26.22,"num":1,"canal":"Direto"},
  {"id_reserva":"135997552","alojamento":"Apto 102-C","hospede":"Davi Batista","chegada":"2026-04-17","partida":"2026-04-19","ano":"2026","mes":"04","receita":1042.48,"com":135.52,"num":1,"canal":"Direto"},
  {"id_reserva":"135962197","alojamento":"Apto 201-H","hospede":"Sergio Coelho Sobrinho","chegada":"2026-04-19","partida":"2026-04-20","ano":"2026","mes":"04","receita":216.11,"com":28.09,"num":1,"canal":"Direto"},
  {"id_reserva":"135961472","alojamento":"apto 104 -G","hospede":"Bertille Cartier","chegada":"2026-04-17","partida":"2026-04-18","ano":"2026","mes":"04","receita":296.44,"com":38.54,"num":1,"canal":"Direto"},
  {"id_reserva":"135886137","alojamento":"Casa 2.5","hospede":"PATRICK VELOSO MAGALHAES DA SILVA RAISSA KETHLYN GOMES DE ARAUJO RAQUEL GOMES FELIPE ANTONIA GOMES","chegada":"2026-04-24","partida":"2026-04-26","ano":"2026","mes":"04","receita":1647.54,"com":214.18,"num":1,"canal":"Direto"},
  {"id_reserva":"135803057","alojamento":"Apto 201-H","hospede":"Romário Silva","chegada":"2026-04-17","partida":"2026-04-18","ano":"2026","mes":"04","receita":250,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"135729427","alojamento":"apto 104 -G","hospede":"José tarcisio Neto","chegada":"2026-04-15","partida":"2026-04-16","ano":"2026","mes":"04","receita":254.7,"com":33.11,"num":1,"canal":"Direto"},
  {"id_reserva":"135679547","alojamento":"Apto 201-H","hospede":"Daisy Leite Vieira Silva","chegada":"2026-04-20","partida":"2026-04-21","ano":"2026","mes":"04","receita":254.7,"com":33.11,"num":1,"canal":"Direto"},
  {"id_reserva":"135580562","alojamento":"apto 104 -G","hospede":"Bruna rizzato","chegada":"2026-04-18","partida":"2026-04-21","ano":"2026","mes":"04","receita":800,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"135578437","alojamento":"Apto 201-H","hospede":"Renato Silva","chegada":"2026-04-18","partida":"2026-04-19","ano":"2026","mes":"04","receita":381.38,"com":49.58,"num":1,"canal":"Direto"},
  {"id_reserva":"135534652","alojamento":"Casa 2.5","hospede":"Bloqueio Sistema","chegada":"2026-04-15","partida":"2026-04-19","ano":"2026","mes":"04","receita":0,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"135471512","alojamento":"Apto 201-H","hospede":"Felype Marinho","chegada":"2026-04-15","partida":"2026-04-17","ano":"2026","mes":"04","receita":380.98,"com":49.53,"num":1,"canal":"Direto"},
  {"id_reserva":"135388382","alojamento":"apto 104 -G","hospede":"Ingrid complemento","chegada":"2026-04-13","partida":"2026-04-14","ano":"2026","mes":"04","receita":216,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"135379887","alojamento":"Apto 103-F","hospede":"Marcelo Bezerra","chegada":"2026-04-13","partida":"2026-04-14","ano":"2026","mes":"04","receita":216.11,"com":28.09,"num":1,"canal":"Direto"},
  {"id_reserva":"135322172","alojamento":"Casa 2.7","hospede":"Bloqueio Sistema","chegada":"2026-04-15","partida":"2026-04-22","ano":"2026","mes":"04","receita":0,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"135275637","alojamento":"apto 104 -G","hospede":"Ingrid Alves","chegada":"2026-04-12","partida":"2026-04-13","ano":"2026","mes":"04","receita":195.08,"com":25.36,"num":1,"canal":"Direto"},
  {"id_reserva":"135032882","alojamento":"apto 104 -G","hospede":"Socorro Ribeiro","chegada":"2026-04-24","partida":"2026-04-25","ano":"2026","mes":"04","receita":250,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"134866292","alojamento":"Casa 2.7","hospede":"Amanda","chegada":"2026-04-10","partida":"2026-04-13","ano":"2026","mes":"04","receita":2400,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"134748767","alojamento":"Apto 201-H","hospede":"Felipe Alberto Gomes da Cunha","chegada":"2026-04-08","partida":"2026-04-09","ano":"2026","mes":"04","receita":206.55,"com":26.85,"num":1,"canal":"Direto"},
  {"id_reserva":"134734032","alojamento":"Apto 201-H","hospede":"ELIEZER GABRIEL DA SILVA JÚNIOR","chegada":"2026-04-12","partida":"2026-04-13","ano":"2026","mes":"04","receita":203.4,"com":26.44,"num":1,"canal":"Direto"},
  {"id_reserva":"134721772","alojamento":"Apto 103-F","hospede":"Beatriz","chegada":"2026-04-08","partida":"2026-04-09","ano":"2026","mes":"04","receita":100,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"134668762","alojamento":"Apto 103-F","hospede":"Bia","chegada":"2026-04-07","partida":"2026-04-08","ano":"2026","mes":"04","receita":120,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"134664517","alojamento":"Apto 103-F","hospede":"Moisés","chegada":"2026-04-19","partida":"2026-04-20","ano":"2026","mes":"04","receita":302,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"134625082","alojamento":"Apto 103-F","hospede":"Ala Diogenes","chegada":"2026-04-12","partida":"2026-04-13","ano":"2026","mes":"04","receita":216.11,"com":28.09,"num":1,"canal":"Direto"},
  {"id_reserva":"134525687","alojamento":"Apto 102-C","hospede":"Célia Mara Ladeia Colen","chegada":"2026-04-09","partida":"2026-04-12","ano":"2026","mes":"04","receita":1661.67,"com":216.02,"num":1,"canal":"Direto"},
  {"id_reserva":"134523217","alojamento":"Apto 103-F","hospede":"Andreia Andreia Pereira Jesus","chegada":"2026-04-15","partida":"2026-04-19","ano":"2026","mes":"04","receita":1080,"com":196.7,"num":1,"canal":"Direto"},
  {"id_reserva":"134472602","alojamento":"Apto 103-F","hospede":"José tarcisio Neto","chegada":"2026-04-06","partida":"2026-04-07","ano":"2026","mes":"04","receita":183.6,"com":23.87,"num":1,"canal":"Direto"},
  {"id_reserva":"134438242","alojamento":"Apto 201-H","hospede":"NORONHA JANF","chegada":"2026-04-06","partida":"2026-04-08","ano":"2026","mes":"04","receita":330.48,"com":42.96,"num":1,"canal":"Direto"},
  {"id_reserva":"134380832","alojamento":"apto 104 -G","hospede":"Naiara sales","chegada":"2026-04-10","partida":"2026-04-12","ano":"2026","mes":"04","receita":518,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"133818162","alojamento":"apto 104 -G","hospede":"Roberta ( complemento )","chegada":"2026-04-03","partida":"2026-04-05","ano":"2026","mes":"04","receita":800,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"133792707","alojamento":"Apto 102-C","hospede":"andre","chegada":"2026-04-12","partida":"2026-04-15","ano":"2026","mes":"04","receita":900,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"133327857","alojamento":"Apto 201-H","hospede":"Ramon Sousa","chegada":"2026-04-02","partida":"2026-04-05","ano":"2026","mes":"04","receita":1631.06,"com":212.04,"num":1,"canal":"Direto"},
  {"id_reserva":"132750357","alojamento":"Apto 103-F","hospede":"Carolina Guilheme Ramalho","chegada":"2026-04-02","partida":"2026-04-05","ano":"2026","mes":"04","receita":1540.45,"com":200.26,"num":1,"canal":"Direto"},
  {"id_reserva":"132158962","alojamento":"Apto 201-H","hospede":"Saionara oliveira Martins","chegada":"2026-04-10","partida":"2026-04-12","ano":"2026","mes":"04","receita":600,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"132103302","alojamento":"Apto 103-F","hospede":"Francisco Beloiano","chegada":"2026-04-10","partida":"2026-04-12","ano":"2026","mes":"04","receita":600,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"132098697","alojamento":"apto 104 -G","hospede":"Rodrigues Andy","chegada":"2026-04-25","partida":"2026-04-27","ano":"2026","mes":"04","receita":669.06,"com":86.98,"num":1,"canal":"Direto"},
  {"id_reserva":"131891107","alojamento":"Apto 102-C","hospede":"Ana Paula","chegada":"2026-04-01","partida":"2026-04-05","ano":"2026","mes":"04","receita":3500,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"131876697","alojamento":"apto 104 -G","hospede":"Roberta Gadelha","chegada":"2026-04-01","partida":"2026-04-03","ano":"2026","mes":"04","receita":2000,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"131287545","alojamento":"Casa 2.7","hospede":"Nós Vamos  semana santa","chegada":"2026-04-01","partida":"2026-04-05","ano":"2026","mes":"04","receita":0,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"130663375","alojamento":"Apto 103-F","hospede":"Paula","chegada":"2026-04-25","partida":"2026-04-26","ano":"2026","mes":"04","receita":300,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"118725501","alojamento":"apto 104 -G","hospede":"Proprietários","chegada":"2026-04-06","partida":"2026-04-10","ano":"2026","mes":"04","receita":0,"com":0,"num":1,"canal":"Direto"}
];

async function main() {
    const { data: unidades, error: errUn } = await db.from('unidades').select('id, nome');
    if (errUn || !unidades) { console.error('Erro ao carregar unidades:', errUn); process.exit(1); }
    console.log('Unidades no banco:', unidades.map(u => u.nome).join(', '));

    const registros = [];
    const semMatch = [];
    for (const r of DADOS) {
        const uid = findUnidadeId(r.alojamento, unidades);
        if (!uid) { semMatch.push(r.alojamento); continue; }
        registros.push({
            id_reserva: r.id_reserva,
            unidade_id: uid,
            ano: r.ano,
            mes: r.mes,
            mes_ano: r.ano + '-' + r.mes,
            receita: r.receita,
            comissao_portais: r.com,
            comissao_short_stay: 0,
            status: 'ativa',
            hospede: r.hospede,
            chegada: r.chegada,
            partida: r.partida,
            num_hospedes: r.num,
            canal: r.canal
        });
    }
    if (semMatch.length > 0) console.warn('Sem match de unidade:', [...new Set(semMatch)]);
    console.log(`Registros prontos para inserir: ${registros.length}/49`);

    // Deletar os id_reserva específicos (remove Jean Castro de abril se estiver lá)
    const unidadesIds = [...new Set(registros.map(r => r.unidade_id))];
    let totalDeletado = 0;
    for (const uid of unidadesIds) {
        const ids = registros.filter(r => r.unidade_id === uid).map(r => r.id_reserva);
        for (let i = 0; i < ids.length; i += 200) {
            const lote = ids.slice(i, i + 200);
            const { data: del, error: errDel } = await db.from('reservas')
                .delete()
                .eq('unidade_id', uid)
                .in('id_reserva', lote)
                .select('id');
            if (errDel) console.warn('Erro delete:', errDel);
            else totalDeletado += (del?.length || 0);
        }
    }
    console.log(`Deletados (duplicatas limpas): ${totalDeletado}`);

    // Inserir em lotes
    let totalInserido = 0;
    for (let i = 0; i < registros.length; i += 200) {
        const lote = registros.slice(i, i + 200);
        const { data: ins, error: errIns } = await db.from('reservas').insert(lote).select('id');
        if (errIns) { console.error(`Erro insert lote ${i}:`, errIns); process.exit(1); }
        totalInserido += (ins?.length || 0);
        console.log(`Inseridos: ${totalInserido}/${registros.length}`);
    }

    // Verificação final
    const { data: verifAbr } = await db.from('reservas')
        .select('id_reserva')
        .eq('mes_ano', '2026-04')
        .not('id_reserva', 'like', 'MOVI%')
        .not('id_reserva', 'like', 'manual-%');
    const { data: verifJC } = await db.from('reservas')
        .select('id_reserva, mes_ano')
        .eq('id_reserva', '132569062');

    console.log(`VERIFICACAO: ${verifAbr?.length ?? 0} registros Smoobu em abril/2026`);
    if (verifJC?.length) {
        const jc = verifJC[0];
        if (jc.mes_ano === '2026-03') {
            console.log('SUCESSO! Jean Castro (132569062) esta corretamente em MARCO (2026-03).');
        } else {
            console.warn(`ATENCAO: Jean Castro esta em ${jc.mes_ano} — deveria ser 2026-03!`);
        }
    }
    console.log(verifAbr?.length === 48 ? 'SUCESSO! 48 registros em abril.' : `ATENCAO: Esperado 48, encontrado ${verifAbr?.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
