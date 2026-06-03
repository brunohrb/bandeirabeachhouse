/**
 * Restaura dados de Maio/2026
 * Fonte: BookingList20260603_1.xlsx (43 registros, exportado do Smoobu)
 * Regra de negócio: mês contábil = mês do check-in
 *
 * Antonio Rqmon (check-in 30/04) → mes_ano='2026-04' (ABRIL)
 * Todos os demais → mes_ano='2026-05' (MAIO)
 *
 * Uso via GitHub Actions: Actions → Restaurar Dados Maio 2026 → Run workflow
 */

const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

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

// 43 registros do BookingList20260603_1.xlsx
// Regra: mês contábil = mês do check-in
// Antonio Rqmon (check-in 30/04) → mes_ano='2026-04' (ABRIL)
const DADOS = [
  // ─── Apto 102-C ───
  {"id_reserva":"141488902","alojamento":"Apto 102-C","hospede":"Ivonilson Costa","chegada":"2026-05-30","partida":"2026-05-31","ano":"2026","mes":"05","receita":864.45,"com":112.38,"num":5,"canal":"Booking.com"},
  {"id_reserva":"140111652","alojamento":"Apto 102-C","hospede":"Edivani de castro","chegada":"2026-05-23","partida":"2026-05-24","ano":"2026","mes":"05","receita":700.00,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"139443092","alojamento":"Apto 102-C","hospede":"Fabio Alercio","chegada":"2026-05-16","partida":"2026-05-17","ano":"2026","mes":"05","receita":915.30,"com":118.99,"num":3,"canal":"Booking.com"},
  {"id_reserva":"133490237","alojamento":"Apto 102-C","hospede":"Mauricio Figueiredo","chegada":"2026-05-01","partida":"2026-05-03","ano":"2026","mes":"05","receita":2000.00,"com":0,"num":8,"canal":"Direto"},

  // ─── Apto 103-F ───
  {"id_reserva":"139569227","alojamento":"Apto 103-F","hospede":"Estefany Rodrigues","chegada":"2026-05-30","partida":"2026-06-01","ano":"2026","mes":"05","receita":531.36,"com":69.08,"num":2,"canal":"Booking.com"},
  {"id_reserva":"140979722","alojamento":"Apto 103-F","hospede":"Valdenizia","chegada":"2026-05-27","partida":"2026-05-29","ano":"2026","mes":"05","receita":400.00,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"138792142","alojamento":"Apto 103-F","hospede":"Adrya Sereno","chegada":"2026-05-24","partida":"2026-05-27","ano":"2026","mes":"05","receita":549.18,"com":71.39,"num":5,"canal":"Booking.com"},
  {"id_reserva":"137694072","alojamento":"Apto 103-F","hospede":"Francisco Lopes","chegada":"2026-05-22","partida":"2026-05-24","ano":"2026","mes":"05","receita":657.90,"com":85.53,"num":2,"canal":"Booking.com"},
  {"id_reserva":"139895407","alojamento":"Apto 103-F","hospede":"Priscila Oliveira","chegada":"2026-05-20","partida":"2026-05-22","ano":"2026","mes":"05","receita":366.12,"com":47.60,"num":2,"canal":"Booking.com"},
  {"id_reserva":"139771407","alojamento":"Apto 103-F","hospede":"Davyd Bruno","chegada":"2026-05-18","partida":"2026-05-19","ano":"2026","mes":"05","receita":228.83,"com":29.75,"num":2,"canal":"Booking.com"},
  {"id_reserva":"138128262","alojamento":"Apto 103-F","hospede":"Italo Neri","chegada":"2026-05-16","partida":"2026-05-18","ano":"2026","mes":"05","receita":631.89,"com":82.15,"num":2,"canal":"Booking.com"},
  {"id_reserva":"139403987","alojamento":"Apto 103-F","hospede":"Romario Silva","chegada":"2026-05-15","partida":"2026-05-16","ano":"2026","mes":"05","receita":200.00,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"139173342","alojamento":"Apto 103-F","hospede":"Matheus Padilha","chegada":"2026-05-12","partida":"2026-05-13","ano":"2026","mes":"05","receita":228.83,"com":29.75,"num":2,"canal":"Booking.com"},
  {"id_reserva":"135873392","alojamento":"Apto 103-F","hospede":"Araceli Martins","chegada":"2026-05-10","partida":"2026-05-12","ano":"2026","mes":"05","receita":641.52,"com":83.40,"num":3,"canal":"Booking.com"},
  {"id_reserva":"138014572","alojamento":"Apto 103-F","hospede":"Lara Carcara","chegada":"2026-05-08","partida":"2026-05-10","ano":"2026","mes":"05","receita":412.29,"com":53.60,"num":4,"canal":"Booking.com"},
  {"id_reserva":"138271532","alojamento":"Apto 103-F","hospede":"John Italo","chegada":"2026-05-06","partida":"2026-05-08","ano":"2026","mes":"05","receita":406.80,"com":52.88,"num":2,"canal":"Booking.com"},
  {"id_reserva":"134894652","alojamento":"Apto 103-F","hospede":"Nathalia Ribeiro","chegada":"2026-05-01","partida":"2026-05-03","ano":"2026","mes":"05","receita":500.00,"com":0,"num":2,"canal":"Direto"},

  // ─── Apto 104-G ───
  // Antonio Rqmon: check-in 30/04 → ABRIL (regra: mês do check-in)
  {"id_reserva":"137471692","alojamento":"apto 104 -G","hospede":"Antonio Rqmon","chegada":"2026-04-30","partida":"2026-05-03","ano":"2026","mes":"04","receita":1133.89,"com":147.41,"num":2,"canal":"Booking.com"},
  {"id_reserva":"128643817","alojamento":"apto 104 -G","hospede":"Ana Wladia","chegada":"2026-05-08","partida":"2026-05-10","ano":"2026","mes":"05","receita":600.00,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"139510037","alojamento":"apto 104 -G","hospede":"Araceli (transferencia)","chegada":"2026-05-14","partida":"2026-05-16","ano":"2026","mes":"05","receita":0,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"139118822","alojamento":"apto 104 -G","hospede":"Roberto Neri","chegada":"2026-05-16","partida":"2026-05-17","ano":"2026","mes":"05","receita":286.54,"com":37.25,"num":4,"canal":"Booking.com"},
  {"id_reserva":"139403547","alojamento":"apto 104 -G","hospede":"Socorro Ribeiro","chegada":"2026-05-21","partida":"2026-05-23","ano":"2026","mes":"05","receita":400.00,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"138740187","alojamento":"apto 104 -G","hospede":"Idalecio Barros","chegada":"2026-05-23","partida":"2026-05-24","ano":"2026","mes":"05","receita":286.54,"com":37.25,"num":2,"canal":"Booking.com"},
  {"id_reserva":"138843557","alojamento":"apto 104 -G","hospede":"Barbara Henrille","chegada":"2026-05-24","partida":"2026-05-27","ano":"2026","mes":"05","receita":570.24,"com":74.13,"num":2,"canal":"Booking.com"},
  {"id_reserva":"141302792","alojamento":"apto 104 -G","hospede":"Fabricio Valle","chegada":"2026-05-28","partida":"2026-05-29","ano":"2026","mes":"05","receita":254.70,"com":33.11,"num":2,"canal":"Booking.com"},
  {"id_reserva":"140770782","alojamento":"apto 104 -G","hospede":"Paulo Augusto Madureira","chegada":"2026-05-29","partida":"2026-05-30","ano":"2026","mes":"05","receita":286.54,"com":37.25,"num":2,"canal":"Booking.com"},
  {"id_reserva":"140112902","alojamento":"apto 104 -G","hospede":"Leo Andrade Albuquerque","chegada":"2026-05-30","partida":"2026-05-31","ano":"2026","mes":"05","receita":250.00,"com":0,"num":3,"canal":"Direto"},

  // ─── Apto 201-H ───
  {"id_reserva":"136969957","alojamento":"Apto 201-H","hospede":"Jessica Martins","chegada":"2026-05-01","partida":"2026-05-03","ano":"2026","mes":"05","receita":650.00,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"137978722","alojamento":"Apto 201-H","hospede":"Safira Matos","chegada":"2026-05-03","partida":"2026-05-05","ano":"2026","mes":"05","receita":432.00,"com":78.68,"num":2,"canal":"Airbnb"},
  {"id_reserva":"138129042","alojamento":"Apto 201-H","hospede":"Antonio Franco Da Silva Junior","chegada":"2026-05-08","partida":"2026-05-09","ano":"2026","mes":"05","receita":228.83,"com":29.75,"num":3,"canal":"Booking.com"},
  {"id_reserva":"131229035","alojamento":"Apto 201-H","hospede":"Ana Vitoria Silva Pereira","chegada":"2026-05-09","partida":"2026-05-11","ano":"2026","mes":"05","receita":669.06,"com":86.98,"num":3,"canal":"Booking.com"},
  {"id_reserva":"138721122","alojamento":"Apto 201-H","hospede":"Rosa Morais","chegada":"2026-05-11","partida":"2026-05-14","ano":"2026","mes":"05","receita":660.00,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"138739552","alojamento":"Apto 201-H","hospede":"Bianca Cervone Paes","chegada":"2026-05-15","partida":"2026-05-17","ano":"2026","mes":"05","receita":500.00,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"139657987","alojamento":"Apto 201-H","hospede":"Leticia Oliveira","chegada":"2026-05-18","partida":"2026-05-21","ano":"2026","mes":"05","receita":660.00,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"139985202","alojamento":"Apto 201-H","hospede":"Camila Araujo","chegada":"2026-05-21","partida":"2026-05-23","ano":"2026","mes":"05","receita":366.48,"com":47.64,"num":2,"canal":"Booking.com"},
  {"id_reserva":"140643607","alojamento":"Apto 201-H","hospede":"Vanderlania Angelo","chegada":"2026-05-24","partida":"2026-05-25","ano":"2026","mes":"05","receita":254.25,"com":33.05,"num":2,"canal":"Booking.com"},
  {"id_reserva":"140829217","alojamento":"Apto 201-H","hospede":"Lethicia","chegada":"2026-05-25","partida":"2026-05-27","ano":"2026","mes":"05","receita":450.00,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"139536202","alojamento":"Apto 201-H","hospede":"Wender Nogueira","chegada":"2026-05-23","partida":"2026-05-24","ano":"2026","mes":"05","receita":254.70,"com":33.11,"num":4,"canal":"Booking.com"},
  {"id_reserva":"118565271","alojamento":"Apto 201-H","hospede":"Amaury Vieira Marinho","chegada":"2026-05-28","partida":"2026-05-31","ano":"2026","mes":"05","receita":1017.36,"com":132.26,"num":2,"canal":"Booking.com"},
  {"id_reserva":"141139542","alojamento":"Apto 201-H","hospede":"Jose Tarcisio Neto","chegada":"2026-05-27","partida":"2026-05-28","ano":"2026","mes":"05","receita":254.70,"com":33.11,"num":2,"canal":"Booking.com"},

  // ─── Casa 2.5 ───
  {"id_reserva":"136339642","alojamento":"Casa 2.5","hospede":"Vanessa Madeira Santiago","chegada":"2026-05-01","partida":"2026-05-03","ano":"2026","mes":"05","receita":2160.00,"com":393.40,"num":11,"canal":"Airbnb"},
  {"id_reserva":"136456832","alojamento":"Casa 2.5","hospede":"Thiago Coveiro","chegada":"2026-05-15","partida":"2026-05-17","ano":"2026","mes":"05","receita":0,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"139272682","alojamento":"Casa 2.5","hospede":"Edgard Cordeiro","chegada":"2026-05-28","partida":"2026-05-31","ano":"2026","mes":"05","receita":2207.03,"com":286.91,"num":4,"canal":"Booking.com"},
];

async function main() {
    const { data: unidades, error: errUn } = await db.from('unidades').select('id, nome');
    if (errUn) throw new Error('Erro ao carregar unidades: ' + errUn.message);
    console.log(`🏠 Unidades: ${unidades.map(u => u.nome).join(', ')}`);

    // Montar registros com unidade_id resolvido
    const registros = DADOS.map(d => {
        const unidade_id = findUnidadeId(d.alojamento, unidades);
        if (!unidade_id) {
            console.warn(`⚠️ Sem mapeamento: "${d.alojamento}"`);
            return null;
        }
        return {
            id: randomUUID(),
            id_reserva: d.id_reserva,
            unidade_id,
            ano: d.ano,
            mes: d.mes,
            mes_ano: `${d.ano}-${d.mes}`,
            receita: d.receita,
            comissao_portais: d.com,
            comissao_short_stay: 0,
            status: 'ativa',
            hospede: d.hospede,
            chegada: d.chegada,
            partida: d.partida,
            num_hospedes: d.num,
            canal: d.canal,
        };
    }).filter(Boolean);

    const ignorados = DADOS.length - registros.length;
    if (ignorados > 0) console.warn(`⚠️ ${ignorados} registros ignorados por falta de mapeamento`);

    // Agrupar por unidade_id para DELETE cirúrgico
    const porUnidade = {};
    for (const r of registros) {
        if (!porUnidade[r.unidade_id]) porUnidade[r.unidade_id] = [];
        porUnidade[r.unidade_id].push(r);
    }

    for (const [uid, regs] of Object.entries(porUnidade)) {
        const nomeUnidade = unidades.find(u => u.id === uid)?.nome ?? uid;
        const ids = regs.map(r => r.id_reserva);
        const { error: errDel } = await db.from('reservas').delete()
            .eq('unidade_id', uid)
            .in('id_reserva', ids);
        if (errDel) throw new Error(`Erro ao deletar ${nomeUnidade}: ${errDel.message}`);
        console.log(`🗑️  Limpando ${ids.length} id_reservas de "${nomeUnidade}"`);
    }

    // Inserir todos
    const { error: errIns } = await db.from('reservas').insert(registros);
    if (errIns) throw new Error('Erro ao inserir: ' + errIns.message);
    console.log(`✅ ${registros.length} registros inseridos`);

    // Verificação
    const mesMaio  = registros.filter(r => r.mes_ano === '2026-05');
    const mesAbril = registros.filter(r => r.mes_ano === '2026-04');
    console.log(`📊 Maio  (2026-05): ${mesMaio.length} registros — receita R$ ${mesMaio.reduce((s,r) => s + r.receita, 0).toFixed(2)}`);
    console.log(`📊 Abril (2026-04): ${mesAbril.length} registros (Antonio Rqmon — check-in 30/04)`);

    // Verificar Antonio Rqmon no mês correto
    const { data: ar } = await db.from('reservas').select('id_reserva, mes_ano, hospede').eq('id_reserva', '137471692');
    if (ar && ar.length > 0) {
        const ok = ar[0].mes_ano === '2026-04';
        console.log(`${ok ? '✅' : '❌'} Antonio Rqmon: mes_ano=${ar[0].mes_ano} (esperado: 2026-04)`);
    }

    console.log('🎉 Restore de Maio/2026 concluído!');
}

main().catch(err => { console.error('❌ Erro:', err.message); process.exit(1); });
