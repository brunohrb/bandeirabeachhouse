/**
 * Restaura dados de Dezembro/2025 + Janeiro-Março/2026
 * Fonte: BookingList20260514_1.xlsx (169 registros, exportado do Smoobu)
 * Regra de negócio: mês contábil = mês do check-in
 *
 * Uso via GitHub Actions: Actions → Restaurar Jan-Mar 2026 → Run workflow
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

// Mapa de nomes do Smoobu para nomes no Supabase
function normalizarNome(nome) {
    if (!nome) return '';
    return nome.toLowerCase().replace(/\s+/g, ' ').trim();
}

function findUnidadeId(alojamento, unidades) {
    const norm = normalizarNome(alojamento);
    // match direto
    let u = unidades.find(u => normalizarNome(u.nome) === norm);
    if (u) return u.id;
    // match por número
    const num = alojamento.match(/(\d+(?:\.\d+)?)/);
    if (num) {
        u = unidades.find(u => u.nome.includes(num[1]));
        if (u) return u.id;
    }
    return null;
}

// 170 reservas Dez/2025 + Jan-Mar/2026 extraídas do Smoobu (BookingList20260514_1.xlsx + BookingList20260514_3.xlsx)
// Regra: mês contábil = mês do check-in (Jean Castro check-in 31/03 → contabiliza em março)
const DADOS = [
  // 6 reservas de Réveillon — check-in dezembro/2025
  {"id_reserva":"121751431","alojamento":"Casa 2.7","hospede":"Manoela Martins","chegada":"2025-12-29","partida":"2026-01-01","ano":"2025","mes":"12","receita":16260.3,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"110075846","alojamento":"Apto 201-H","hospede":"Maria de Lourdes Ferreira Gomes","chegada":"2025-12-31","partida":"2026-01-01","ano":"2025","mes":"12","receita":1488,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"109806956","alojamento":"Apto 103-F","hospede":"Rebeca Braga","chegada":"2025-12-27","partida":"2026-01-01","ano":"2025","mes":"12","receita":6864.75,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"105486461","alojamento":"Casa 2.5","hospede":"Felipe Holanda ( falta pgnto com 102)","chegada":"2025-12-28","partida":"2026-01-01","ano":"2025","mes":"12","receita":19500,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"101670973","alojamento":"Apto 102-C","hospede":"Felipe holanda (à pagar junto com 2.5 )","chegada":"2025-12-27","partida":"2026-01-01","ano":"2025","mes":"12","receita":6500,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"99486608","alojamento":"apto 104 -G","hospede":"Allana Layana (josias )","chegada":"2025-12-28","partida":"2026-01-01","ano":"2025","mes":"12","receita":4000,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"133674432","alojamento":"Apto 201-H","hospede":"Afrania Lorena Lima Pereira","chegada":"2026-03-30","partida":"2026-03-31","ano":"2026","mes":"03","receita":248.63,"com":32.32,"num":2,"canal":"Booking.com"},
  {"id_reserva":"133509032","alojamento":"Apto 201-H","hospede":"Allan Júnior","chegada":"2026-03-29","partida":"2026-03-30","ano":"2026","mes":"03","receita":216.11,"com":28.09,"num":2,"canal":"Booking.com"},
  {"id_reserva":"132735717","alojamento":"Apto 103-F","hospede":"Gabriela Alves","chegada":"2026-03-24","partida":"2026-03-25","ano":"2026","mes":"03","receita":216.11,"com":28.09,"num":4,"canal":"Booking.com"},
  {"id_reserva":"132667802","alojamento":"Apto 103-F","hospede":"andrey complemento","chegada":"2026-03-23","partida":"2026-03-24","ano":"2026","mes":"03","receita":100,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"132531077","alojamento":"apto 104 -G","hospede":"Patricia Quinto","chegada":"2026-03-22","partida":"2026-03-23","ano":"2026","mes":"03","receita":216.11,"com":28.09,"num":2,"canal":"Booking.com"},
  {"id_reserva":"132528452","alojamento":"Apto 103-F","hospede":"ANDREY MOTA","chegada":"2026-03-22","partida":"2026-03-23","ano":"2026","mes":"03","receita":203.4,"com":26.44,"num":2,"canal":"Booking.com"},
  {"id_reserva":"132425352","alojamento":"Apto 103-F","hospede":"Rafael Mourão Rocha","chegada":"2026-03-25","partida":"2026-03-27","ano":"2026","mes":"03","receita":366.12,"com":47.6,"num":2,"canal":"Booking.com"},
  {"id_reserva":"132334902","alojamento":"Apto 201-H","hospede":"Natasha Assumpção","chegada":"2026-03-24","partida":"2026-03-25","ano":"2026","mes":"03","receita":270.62,"com":35.18,"num":2,"canal":"Booking.com"},
  {"id_reserva":"132317547","alojamento":"Apto 102-C","hospede":"Marcos ( complemento )","chegada":"2026-03-21","partida":"2026-03-22","ano":"2026","mes":"03","receita":350,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"132108632","alojamento":"Apto 201-H","hospede":"Farah Jamil","chegada":"2026-03-20","partida":"2026-03-21","ano":"2026","mes":"03","receita":216.11,"com":28.09,"num":2,"canal":"Booking.com"},
  {"id_reserva":"131969242","alojamento":"Apto 103-F","hospede":"Romário Silva","chegada":"2026-03-18","partida":"2026-03-19","ano":"2026","mes":"03","receita":180,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"131912062","alojamento":"apto 104 -G","hospede":"Tabata Do Carmo","chegada":"2026-03-21","partida":"2026-03-22","ano":"2026","mes":"03","receita":270.62,"com":35.18,"num":2,"canal":"Booking.com"},
  {"id_reserva":"131911517","alojamento":"Apto 102-C","hospede":"Guerreiro Marcos","chegada":"2026-03-18","partida":"2026-03-21","ano":"2026","mes":"03","receita":610.2,"com":79.33,"num":2,"canal":"Booking.com"},
  {"id_reserva":"131779805","alojamento":"Apto 103-F","hospede":"Vitória Karen","chegada":"2026-03-19","partida":"2026-03-20","ano":"2026","mes":"03","receita":228.83,"com":29.75,"num":2,"canal":"Booking.com"},
  {"id_reserva":"131668690","alojamento":"Apto 102-C","hospede":"Rian","chegada":"2026-03-15","partida":"2026-03-16","ano":"2026","mes":"03","receita":0,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"131638305","alojamento":"apto 104 -G","hospede":"Francisco Afonso de Paiva Junior","chegada":"2026-03-19","partida":"2026-03-20","ano":"2026","mes":"03","receita":254.7,"com":33.11,"num":2,"canal":"Booking.com"},
  {"id_reserva":"131541095","alojamento":"Casa 2.7","hospede":"Diego Silva arruda","chegada":"2026-03-19","partida":"2026-03-22","ano":"2026","mes":"03","receita":2370,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"131292970","alojamento":"Apto 103-F","hospede":"Tágila Ribeiro","chegada":"2026-03-15","partida":"2026-03-17","ano":"2026","mes":"03","receita":412.29,"com":53.6,"num":2,"canal":"Booking.com"},
  {"id_reserva":"131265895","alojamento":"Casa 2.7","hospede":"Romário complemento","chegada":"2026-03-11","partida":"2026-03-12","ano":"2026","mes":"03","receita":750,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"131258285","alojamento":"apto 104 -G","hospede":"Maria do Socorro Ribeiro","chegada":"2026-03-17","partida":"2026-03-18","ano":"2026","mes":"03","receita":286.54,"com":37.25,"num":2,"canal":"Booking.com"},
  {"id_reserva":"131247690","alojamento":"Apto 103-F","hospede":"Rebeca França Leitão ( Amiga Do Pai /iguatemi)","chegada":"2026-03-13","partida":"2026-03-15","ano":"2026","mes":"03","receita":0,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"131227255","alojamento":"Casa 2.5","hospede":"Crislany Oliveira","chegada":"2026-03-14","partida":"2026-03-16","ano":"2026","mes":"03","receita":1464.48,"com":190.38,"num":2,"canal":"Booking.com"},
  {"id_reserva":"131036785","alojamento":"Apto 102-C","hospede":"Nathalia Pereira","chegada":"2026-03-22","partida":"2026-03-25","ano":"2026","mes":"03","receita":1782,"com":324.56,"num":4,"canal":"Airbnb"},
  {"id_reserva":"130998040","alojamento":"apto 104 -G","hospede":"Rafaela Matos","chegada":"2026-03-12","partida":"2026-03-13","ano":"2026","mes":"03","receita":216.11,"com":28.09,"num":3,"canal":"Booking.com"},
  {"id_reserva":"130979110","alojamento":"Apto 103-F","hospede":"José tarcisio Neto","chegada":"2026-03-10","partida":"2026-03-11","ano":"2026","mes":"03","receita":254.7,"com":33.11,"num":3,"canal":"Booking.com"},
  {"id_reserva":"130936585","alojamento":"Apto 102-C","hospede":"Jamil","chegada":"2026-03-12","partida":"2026-03-13","ano":"2026","mes":"03","receita":0,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"130900755","alojamento":"apto 104 -G","hospede":"Jaiane Duarte","chegada":"2026-03-15","partida":"2026-03-16","ano":"2026","mes":"03","receita":228.83,"com":29.75,"num":2,"canal":"Booking.com"},
  {"id_reserva":"130900600","alojamento":"Apto 103-F","hospede":"Emanoel Linhares","chegada":"2026-03-11","partida":"2026-03-13","ano":"2026","mes":"03","receita":458.46,"com":59.6,"num":2,"canal":"Booking.com"},
  {"id_reserva":"130872435","alojamento":"apto 104 -G","hospede":"Rachel Berg","chegada":"2026-03-10","partida":"2026-03-12","ano":"2026","mes":"03","receita":345.78,"com":44.95,"num":2,"canal":"Booking.com"},
  {"id_reserva":"130672895","alojamento":"Casa 2.5","hospede":"aquiles gadelha ponte","chegada":"2026-03-20","partida":"2026-03-22","ano":"2026","mes":"03","receita":1383.12,"com":179.81,"num":2,"canal":"Booking.com"},
  {"id_reserva":"130613070","alojamento":"Casa 2.5","hospede":"FRANCISCO EMANUEL NUNES","chegada":"2026-03-27","partida":"2026-03-29","ano":"2026","mes":"03","receita":1728.9,"com":224.76,"num":8,"canal":"Booking.com"},
  {"id_reserva":"130492110","alojamento":"apto 104 -G","hospede":"Samira Alves Braga","chegada":"2026-03-20","partida":"2026-03-21","ano":"2026","mes":"03","receita":286.54,"com":37.25,"num":3,"canal":"Booking.com"},
  {"id_reserva":"130489440","alojamento":"Apto 201-H","hospede":"Douglas","chegada":"2026-03-27","partida":"2026-03-29","ano":"2026","mes":"03","receita":500,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"130488850","alojamento":"Apto 103-F","hospede":"André gurjao ( Josias )","chegada":"2026-03-20","partida":"2026-03-22","ano":"2026","mes":"03","receita":500,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"130335290","alojamento":"apto 104 -G","hospede":"Criskelly","chegada":"2026-03-05","partida":"2026-03-06","ano":"2026","mes":"03","receita":160,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"130238780","alojamento":"apto 104 -G","hospede":"Ricardo Souza","chegada":"2026-03-06","partida":"2026-03-08","ano":"2026","mes":"03","receita":458.46,"com":59.6,"num":2,"canal":"Booking.com"},
  {"id_reserva":"130221355","alojamento":"Apto 201-H","hospede":"Danielle castelo","chegada":"2026-03-05","partida":"2026-03-08","ano":"2026","mes":"03","receita":500,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"130178760","alojamento":"Apto 103-F","hospede":"Crislany Oliveira","chegada":"2026-03-05","partida":"2026-03-07","ano":"2026","mes":"03","receita":330.48,"com":42.96,"num":2,"canal":"Booking.com"},
  {"id_reserva":"130075895","alojamento":"Apto 102-C","hospede":"cleiriane pires (airbnb paulo )","chegada":"2026-03-08","partida":"2026-03-09","ano":"2026","mes":"03","receita":302,"com":0,"num":4,"canal":"Direto"},
  {"id_reserva":"130047380","alojamento":"apto 104 -G","hospede":"Fernanda ( Josias )","chegada":"2026-03-03","partida":"2026-03-05","ano":"2026","mes":"03","receita":400,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"130046530","alojamento":"Apto 103-F","hospede":"Ryan","chegada":"2026-03-03","partida":"2026-03-04","ano":"2026","mes":"03","receita":100,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"129984315","alojamento":"Apto 201-H","hospede":"Shelly Ferreira","chegada":"2026-03-08","partida":"2026-03-09","ano":"2026","mes":"03","receita":228.83,"com":29.75,"num":4,"canal":"Booking.com"},
  {"id_reserva":"129930855","alojamento":"Apto 103-F","hospede":"Beatriz","chegada":"2026-03-02","partida":"2026-03-03","ano":"2026","mes":"03","receita":60,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"129808825","alojamento":"Apto 103-F","hospede":"beatriz","chegada":"2026-03-01","partida":"2026-03-02","ano":"2026","mes":"03","receita":150,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"129459785","alojamento":"Casa 2.7","hospede":"Romário Silva","chegada":"2026-03-09","partida":"2026-03-11","ano":"2026","mes":"03","receita":1500,"com":0,"num":13,"canal":"Direto"},
  {"id_reserva":"129444655","alojamento":"Casa 2.7","hospede":"Suellen Ribeiro","chegada":"2026-03-13","partida":"2026-03-15","ano":"2026","mes":"03","receita":1901.8,"com":247.23,"num":10,"canal":"Booking.com"},
  {"id_reserva":"129345907","alojamento":"Apto 103-F","hospede":"Heloisa Helena","chegada":"2026-03-07","partida":"2026-03-09","ano":"2026","mes":"03","receita":412.29,"com":53.6,"num":2,"canal":"Booking.com"},
  {"id_reserva":"129291342","alojamento":"Casa 2.7","hospede":"Fxsurf Ximenes","chegada":"2026-02-25","partida":"2026-02-28","ano":"2026","mes":"02","receita":756,"com":137.68,"num":1,"canal":"Airbnb"},
  {"id_reserva":"129188952","alojamento":"apto 104 -G","hospede":"Valdenizia de freitas araujo","chegada":"2026-03-27","partida":"2026-03-29","ano":"2026","mes":"03","receita":440,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"129025357","alojamento":"apto 104 -G","hospede":"Jorge Luiz Lima Felix","chegada":"2026-02-23","partida":"2026-02-24","ano":"2026","mes":"02","receita":228.83,"com":29.75,"num":2,"canal":"Booking.com"},
  {"id_reserva":"128987042","alojamento":"Apto 103-F","hospede":"Rafaela Matos","chegada":"2026-02-27","partida":"2026-03-01","ano":"2026","mes":"02","receita":475.83,"com":61.86,"num":4,"canal":"Booking.com"},
  {"id_reserva":"128933962","alojamento":"Apto 102-C","hospede":"Anderson","chegada":"2026-02-28","partida":"2026-03-01","ano":"2026","mes":"02","receita":250,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"128916242","alojamento":"Apto 103-F","hospede":"Lindebergue Sena","chegada":"2026-03-27","partida":"2026-03-29","ano":"2026","mes":"03","receita":280,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"128875132","alojamento":"apto 104 -G","hospede":"Noeme","chegada":"2026-02-22","partida":"2026-02-23","ano":"2026","mes":"02","receita":200,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"128831027","alojamento":"Apto 103-F","hospede":"Marcelo Tavares","chegada":"2026-02-22","partida":"2026-02-23","ano":"2026","mes":"02","receita":228.83,"com":29.75,"num":4,"canal":"Booking.com"},
  {"id_reserva":"128684577","alojamento":"Apto 103-F","hospede":"Danyelle Castelo","chegada":"2026-02-25","partida":"2026-02-27","ano":"2026","mes":"02","receita":498,"com":90.7,"num":2,"canal":"Airbnb"},
  {"id_reserva":"128660892","alojamento":"apto 104 -G","hospede":"Jenyffer kelly Floriano","chegada":"2026-02-25","partida":"2026-02-27","ano":"2026","mes":"02","receita":421.2,"com":54.76,"num":2,"canal":"Booking.com"},
  {"id_reserva":"128375937","alojamento":"Apto 103-F","hospede":"José tarcisio Neto","chegada":"2026-02-18","partida":"2026-02-19","ano":"2026","mes":"02","receita":216.11,"com":28.09,"num":3,"canal":"Booking.com"},
  {"id_reserva":"128197642","alojamento":"Apto 103-F","hospede":"Marcelo Pereira","chegada":"2026-02-23","partida":"2026-02-24","ano":"2026","mes":"02","receita":254.7,"com":33.11,"num":2,"canal":"Booking.com"},
  {"id_reserva":"128155297","alojamento":"Apto 201-H","hospede":"Victor Muñoz Larreta","chegada":"2026-03-09","partida":"2026-03-16","ano":"2026","mes":"03","receita":1712.3,"com":222.6,"num":3,"canal":"Booking.com"},
  {"id_reserva":"127911572","alojamento":"Apto 201-H","hospede":"Brenno Alecksander Rodrigues Paula","chegada":"2026-02-18","partida":"2026-02-19","ano":"2026","mes":"02","receita":171.16,"com":22.25,"num":1,"canal":"Booking.com"},
  {"id_reserva":"127829217","alojamento":"Apto 103-F","hospede":"Fabiano complemento","chegada":"2026-02-13","partida":"2026-02-14","ano":"2026","mes":"02","receita":250,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"127711727","alojamento":"Apto 201-H","hospede":"Igor Feitosa Magalhaes","chegada":"2026-02-22","partida":"2026-02-24","ano":"2026","mes":"02","receita":540,"com":98.34,"num":3,"canal":"Airbnb"},
  {"id_reserva":"127647102","alojamento":"Apto 201-H","hospede":"Sandrine","chegada":"2026-02-12","partida":"2026-02-13","ano":"2026","mes":"02","receita":230,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"127581283","alojamento":"Apto 102-C","hospede":"Erika Rodrigues","chegada":"2026-02-19","partida":"2026-02-20","ano":"2026","mes":"02","receita":594.79,"com":77.32,"num":2,"canal":"Booking.com"},
  {"id_reserva":"127573275","alojamento":"Apto 103-F","hospede":"yago Neves","chegada":"2026-02-12","partida":"2026-02-13","ano":"2026","mes":"02","receita":228.83,"com":29.75,"num":2,"canal":"Booking.com"},
  {"id_reserva":"127512131","alojamento":"apto 104 -G","hospede":"Francisca Janete Alves Araújo","chegada":"2026-02-11","partida":"2026-02-12","ano":"2026","mes":"02","receita":228.83,"com":29.75,"num":2,"canal":"Booking.com"},
  {"id_reserva":"127480423","alojamento":"Apto 201-H","hospede":"Sandrine Mont'alverne","chegada":"2026-02-11","partida":"2026-02-12","ano":"2026","mes":"02","receita":250,"com":0,"num":2,"canal":"Direto"},
  {"id_reserva":"127173231","alojamento":"apto 104 -G","hospede":"Paulo Fernando Silva Ribeiro","chegada":"2026-02-12","partida":"2026-02-13","ano":"2026","mes":"02","receita":181.23,"com":23.56,"num":2,"canal":"Booking.com"},
  {"id_reserva":"126974996","alojamento":"Apto 103-F","hospede":"Janaina Monteiro","chegada":"2026-02-11","partida":"2026-02-12","ano":"2026","mes":"02","receita":216.11,"com":28.09,"num":2,"canal":"Booking.com"},
  {"id_reserva":"126793831","alojamento":"Apto 201-H","hospede":"Romildo Deodatto Júnior","chegada":"2026-02-05","partida":"2026-02-06","ano":"2026","mes":"02","receita":162.9,"com":21.18,"num":2,"canal":"Booking.com"},
  {"id_reserva":"126785961","alojamento":"Apto 103-F","hospede":"Dennis de Boo","chegada":"2026-02-05","partida":"2026-02-07","ano":"2026","mes":"02","receita":277.2,"com":36.04,"num":1,"canal":"Booking.com"},
  {"id_reserva":"126694401","alojamento":"apto 104 -G","hospede":"Ignacio Giordano","chegada":"2026-02-04","partida":"2026-02-06","ano":"2026","mes":"02","receita":293.76,"com":38.19,"num":2,"canal":"Booking.com"},
  {"id_reserva":"126670376","alojamento":"Casa 2.7","hospede":"Oswaldo Schreder Junior","chegada":"2026-03-01","partida":"2026-03-08","ano":"2026","mes":"03","receita":1462,"com":0,"num":1,"canal":"Airbnb"},
  {"id_reserva":"126549646","alojamento":"apto 104 -G","hospede":"Miriam Paris","chegada":"2026-02-03","partida":"2026-02-04","ano":"2026","mes":"02","receita":195.08,"com":25.36,"num":2,"canal":"Booking.com"},
  {"id_reserva":"126521616","alojamento":"Apto 102-C","hospede":"thiago rousseau","chegada":"2026-02-07","partida":"2026-02-09","ano":"2026","mes":"02","receita":1200,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"126520461","alojamento":"Apto 103-F","hospede":"Raquel Oliveira","chegada":"2026-02-03","partida":"2026-02-05","ano":"2026","mes":"02","receita":293.22,"com":38.12,"num":2,"canal":"Booking.com"},
  {"id_reserva":"126467381","alojamento":"Apto 201-H","hospede":"Jonas Nygaard Hansen","chegada":"2026-02-03","partida":"2026-02-05","ano":"2026","mes":"02","receita":346,"com":63.02,"num":2,"canal":"Airbnb"},
  {"id_reserva":"126447596","alojamento":"apto 104 -G","hospede":"Fabiano Wilians Wilians Satis Taner","chegada":"2026-02-08","partida":"2026-02-11","ano":"2026","mes":"02","receita":585,"com":106.55,"num":2,"canal":"Airbnb"},
  {"id_reserva":"126286426","alojamento":"Apto 102-C","hospede":"Jean cruz ( ressarc problema hosp anterior )","chegada":"2026-03-27","partida":"2026-03-29","ano":"2026","mes":"03","receita":250,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"126267156","alojamento":"apto 104 -G","hospede":"Livia Nojosa Nojosa","chegada":"2026-02-01","partida":"2026-02-03","ano":"2026","mes":"02","receita":432,"com":78.68,"num":2,"canal":"Airbnb"},
  {"id_reserva":"126130276","alojamento":"Apto 102-C","hospede":"germano","chegada":"2026-03-06","partida":"2026-03-08","ano":"2026","mes":"03","receita":1200,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"126060706","alojamento":"Apto 201-H","hospede":"Glauco Barreto","chegada":"2026-02-14","partida":"2026-02-18","ano":"2026","mes":"02","receita":3624.6,"com":471.2,"num":3,"canal":"Booking.com"},
  {"id_reserva":"126015681","alojamento":"Apto 103-F","hospede":"Fabiano Reis","chegada":"2026-02-14","partida":"2026-02-17","ano":"2026","mes":"02","receita":2416.38,"com":314.13,"num":2,"canal":"Booking.com"},
  {"id_reserva":"126005501","alojamento":"Apto 103-F","hospede":"Izabele Viana","chegada":"2026-02-01","partida":"2026-02-03","ano":"2026","mes":"02","receita":366.12,"com":47.6,"num":4,"canal":"Booking.com"},
  {"id_reserva":"125893636","alojamento":"Apto 201-H","hospede":"Elizângela","chegada":"2026-01-29","partida":"2026-01-30","ano":"2026","mes":"01","receita":180,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"125855486","alojamento":"Apto 201-H","hospede":"Mariana Farias","chegada":"2026-02-20","partida":"2026-02-22","ano":"2026","mes":"02","receita":619.2,"com":80.5,"num":2,"canal":"Booking.com"},
  {"id_reserva":"125825126","alojamento":"apto 104 -G","hospede":"guillermo cremona","chegada":"2026-01-29","partida":"2026-01-30","ano":"2026","mes":"01","receita":216.11,"com":28.09,"num":3,"canal":"Booking.com"},
  {"id_reserva":"125661146","alojamento":"apto 104 -G","hospede":"Elisângela Costa","chegada":"2026-01-27","partida":"2026-01-29","ano":"2026","mes":"01","receita":345.78,"com":44.95,"num":1,"canal":"Booking.com"},
  {"id_reserva":"125549736","alojamento":"Apto 201-H","hospede":"Giordano Forte","chegada":"2026-01-27","partida":"2026-01-29","ano":"2026","mes":"01","receita":648,"com":118.02,"num":2,"canal":"Airbnb"},
  {"id_reserva":"125493146","alojamento":"Apto 201-H","hospede":"Júnior Alves","chegada":"2026-01-30","partida":"2026-02-01","ano":"2026","mes":"01","receita":641.52,"com":83.4,"num":2,"canal":"Booking.com"},
  {"id_reserva":"125394881","alojamento":"Apto 201-H","hospede":"Nilton Cesar Vieira Silva","chegada":"2026-02-06","partida":"2026-02-08","ano":"2026","mes":"02","receita":673.2,"com":87.52,"num":3,"canal":"Booking.com"},
  {"id_reserva":"125243606","alojamento":"apto 104 -G","hospede":"Barbara banida","chegada":"2026-01-30","partida":"2026-01-31","ano":"2026","mes":"01","receita":350,"com":0,"num":2,"canal":"Airbnb"},
  {"id_reserva":"125018401","alojamento":"apto 104 -G","hospede":"Priscila Dos santos martins","chegada":"2026-01-25","partida":"2026-01-27","ano":"2026","mes":"01","receita":475.83,"com":61.86,"num":2,"canal":"Booking.com"},
  {"id_reserva":"125012536","alojamento":"Casa 2.5","hospede":"Dorival Ferreira","chegada":"2026-01-23","partida":"2026-01-25","ano":"2026","mes":"01","receita":1767.42,"com":229.76,"num":4,"canal":"Booking.com"},
  {"id_reserva":"125011626","alojamento":"Apto 201-H","hospede":"Patrícia Dantas","chegada":"2026-01-25","partida":"2026-01-27","ano":"2026","mes":"01","receita":503.82,"com":65.5,"num":2,"canal":"Booking.com"},
  {"id_reserva":"124623271","alojamento":"Apto 103-F","hospede":"Rayssa Feitosa","chegada":"2026-01-20","partida":"2026-01-21","ano":"2026","mes":"01","receita":286.54,"com":37.25,"num":2,"canal":"Booking.com"},
  {"id_reserva":"124614711","alojamento":"Apto 201-H","hospede":"Tamyres complemento","chegada":"2026-01-20","partida":"2026-01-21","ano":"2026","mes":"01","receita":324,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"124472271","alojamento":"Apto 201-H","hospede":"Raphaela Soares","chegada":"2026-02-01","partida":"2026-02-03","ano":"2026","mes":"02","receita":549.18,"com":71.39,"num":2,"canal":"Booking.com"},
  {"id_reserva":"124332666","alojamento":"Apto 102-C","hospede":"Daniela Marquez De Lima","chegada":"2026-01-24","partida":"2026-01-25","ano":"2026","mes":"01","receita":864.45,"com":112.38,"num":2,"canal":"Booking.com"},
  {"id_reserva":"124286156","alojamento":"Apto 103-F","hospede":"Lindebergue Sena","chegada":"2026-02-19","partida":"2026-02-22","ano":"2026","mes":"02","receita":863.28,"com":112.23,"num":3,"canal":"Booking.com"},
  {"id_reserva":"124218176","alojamento":"Apto 201-H","hospede":"Júlia Matoso","chegada":"2026-01-21","partida":"2026-01-22","ano":"2026","mes":"01","receita":270.62,"com":35.18,"num":2,"canal":"Booking.com"},
  {"id_reserva":"124153901","alojamento":"apto 104 -G","hospede":"Tiara Roberto Araruna","chegada":"2026-01-18","partida":"2026-01-19","ano":"2026","mes":"01","receita":286.54,"com":37.25,"num":2,"canal":"Booking.com"},
  {"id_reserva":"124101156","alojamento":"apto 104 -G","hospede":"Pedro","chegada":"2026-01-23","partida":"2026-01-25","ano":"2026","mes":"01","receita":624,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"124004596","alojamento":"Apto 103-F","hospede":"Francisco Irisnan Melo","chegada":"2026-01-23","partida":"2026-01-25","ano":"2026","mes":"01","receita":605.88,"com":78.76,"num":2,"canal":"Booking.com"},
  {"id_reserva":"123909496","alojamento":"Apto 103-F","hospede":"César da Silva Xavier Patrícia Ferreira Barreto Xavier","chegada":"2026-02-07","partida":"2026-02-09","ano":"2026","mes":"02","receita":588,"com":76.44,"num":2,"canal":"Booking.com"},
  {"id_reserva":"123770106","alojamento":"apto 104 -G","hospede":"Walber ( amigo Lorena )","chegada":"2026-03-13","partida":"2026-03-15","ano":"2026","mes":"03","receita":0,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"123497451","alojamento":"Casa 2.7","hospede":"Nós vamos","chegada":"2026-01-30","partida":"2026-02-01","ano":"2026","mes":"01","receita":0,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"123416066","alojamento":"apto 104 -G","hospede":"Alessandra Araujo Farias","chegada":"2026-02-27","partida":"2026-03-01","ano":"2026","mes":"02","receita":657.9,"com":85.53,"num":4,"canal":"Booking.com"},
  {"id_reserva":"123393351","alojamento":"Apto 103-F","hospede":"CLIDENOR PAZ","chegada":"2026-01-19","partida":"2026-01-20","ano":"2026","mes":"01","receita":343.24,"com":44.62,"num":4,"canal":"Booking.com"},
  {"id_reserva":"123313951","alojamento":"Apto 102-C","hospede":"Lucas Anjos","chegada":"2026-01-10","partida":"2026-01-11","ano":"2026","mes":"01","receita":594.79,"com":77.32,"num":2,"canal":"Booking.com"},
  {"id_reserva":"123224831","alojamento":"Apto 102-C","hospede":"Hélcio Aguiar Sales","chegada":"2026-01-09","partida":"2026-01-10","ano":"2026","mes":"01","receita":629.78,"com":81.87,"num":4,"canal":"Booking.com"},
  {"id_reserva":"123216561","alojamento":"Apto 201-H","hospede":"Gabriel Gomes de Paiva","chegada":"2026-01-22","partida":"2026-01-24","ano":"2026","mes":"01","receita":562.28,"com":73.1,"num":2,"canal":"Booking.com"},
  {"id_reserva":"122903531","alojamento":"Apto 201-H","hospede":"Emanuel Fernandes","chegada":"2026-01-16","partida":"2026-01-18","ano":"2026","mes":"01","receita":641.52,"com":83.4,"num":2,"canal":"Booking.com"},
  {"id_reserva":"122822056","alojamento":"Apto 201-H","hospede":"Tamyres Almeida Vieira Ribeiro","chegada":"2026-01-18","partida":"2026-01-20","ano":"2026","mes":"01","receita":648,"com":118.02,"num":2,"canal":"Airbnb"},
  {"id_reserva":"122788066","alojamento":"Apto 201-H","hospede":"Paula complemento","chegada":"2026-01-07","partida":"2026-01-08","ano":"2026","mes":"01","receita":250,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"122727001","alojamento":"Apto 102-C","hospede":"Vitória vai","chegada":"2026-01-11","partida":"2026-01-16","ano":"2026","mes":"01","receita":0,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"122608676","alojamento":"apto 104 -G","hospede":"Fernando gall","chegada":"2026-02-06","partida":"2026-02-08","ano":"2026","mes":"02","receita":518,"com":0,"num":3,"canal":"Direto"},
  {"id_reserva":"122601866","alojamento":"apto 104 -G","hospede":"MATEUS SAMPAIO ANDRADE ROCHA DE HOLANDA FARIAS","chegada":"2026-02-20","partida":"2026-02-22","ano":"2026","mes":"02","receita":688,"com":89.44,"num":2,"canal":"Booking.com"},
  {"id_reserva":"122527581","alojamento":"Apto 102-C","hospede":"André Miranda","chegada":"2026-01-16","partida":"2026-01-18","ano":"2026","mes":"01","receita":1500,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"122485946","alojamento":"apto 104 -G","hospede":"Higina Rosa Brito Nunes","chegada":"2026-01-11","partida":"2026-01-13","ano":"2026","mes":"01","receita":610.2,"com":79.33,"num":2,"canal":"Booking.com"},
  {"id_reserva":"122482086","alojamento":"Apto 103-F","hospede":"Pinheiro Samia","chegada":"2026-01-11","partida":"2026-01-13","ano":"2026","mes":"01","receita":518.68,"com":67.43,"num":2,"canal":"Booking.com"},
  {"id_reserva":"122421501","alojamento":"Apto 201-H","hospede":"Mabily Avelino","chegada":"2026-01-24","partida":"2026-01-25","ano":"2026","mes":"01","receita":396,"com":51.48,"num":4,"canal":"Booking.com"},
  {"id_reserva":"122418101","alojamento":"Casa 2.7","hospede":"Lorena Glauca","chegada":"2026-01-16","partida":"2026-01-18","ano":"2026","mes":"01","receita":3200,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"122379971","alojamento":"apto 104 -G","hospede":"Proprietários","chegada":"2026-02-13","partida":"2026-02-18","ano":"2026","mes":"02","receita":0,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"122371756","alojamento":"Apto 201-H","hospede":"jefferson matheus nunes","chegada":"2026-01-11","partida":"2026-01-13","ano":"2026","mes":"01","receita":549.18,"com":71.39,"num":2,"canal":"Booking.com"},
  {"id_reserva":"122356246","alojamento":"Casa 2.5","hospede":"Aline Cavalcante","chegada":"2026-01-08","partida":"2026-01-11","ano":"2026","mes":"01","receita":0,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"122077906","alojamento":"Apto 103-F","hospede":"Elizabeth Araujo","chegada":"2026-01-04","partida":"2026-01-05","ano":"2026","mes":"01","receita":270.62,"com":35.18,"num":2,"canal":"Booking.com"},
  {"id_reserva":"121936126","alojamento":"Casa 2.7","hospede":"Sangiorgy de oliveira","chegada":"2026-01-08","partida":"2026-01-11","ano":"2026","mes":"01","receita":3538,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"121829886","alojamento":"apto 104 -G","hospede":"Renato Gomes Barreto","chegada":"2026-01-01","partida":"2026-01-02","ano":"2026","mes":"01","receita":324.17,"com":42.14,"num":2,"canal":"Booking.com"},
  {"id_reserva":"121749691","alojamento":"Casa 2.5","hospede":"Alan Kardek","chegada":"2026-01-15","partida":"2026-01-18","ano":"2026","mes":"01","receita":0,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"121590341","alojamento":"apto 104 -G","hospede":"Dr. Carmem","chegada":"2026-01-19","partida":"2026-01-23","ano":"2026","mes":"01","receita":1200,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"121518856","alojamento":"Apto 103-F","hospede":"Sara Santiago","chegada":"2026-01-31","partida":"2026-02-01","ano":"2026","mes":"01","receita":298,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"121191561","alojamento":"Apto 102-C","hospede":"Maria socorro Moreira","chegada":"2026-01-06","partida":"2026-01-07","ano":"2026","mes":"01","receita":450,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"120759236","alojamento":"Apto 102-C","hospede":"Carvalho Thais","chegada":"2026-01-04","partida":"2026-01-06","ano":"2026","mes":"01","receita":1119.6,"com":145.55,"num":4,"canal":"Booking.com"},
  {"id_reserva":"120757661","alojamento":"Apto 201-H","hospede":"Paula Rivelly","chegada":"2026-01-05","partida":"2026-01-07","ano":"2026","mes":"01","receita":503.82,"com":65.5,"num":3,"canal":"Booking.com"},
  {"id_reserva":"120638996","alojamento":"Apto 201-H","hospede":"Sara Costa de Holanda Sara","chegada":"2026-01-08","partida":"2026-01-11","ano":"2026","mes":"01","receita":865.22,"com":112.48,"num":3,"canal":"Booking.com"},
  {"id_reserva":"120475661","alojamento":"Apto 201-H","hospede":"Mirela Fernandes","chegada":"2026-01-13","partida":"2026-01-16","ano":"2026","mes":"01","receita":900,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"120438326","alojamento":"apto 104 -G","hospede":"Thiago Freitas","chegada":"2026-01-14","partida":"2026-01-16","ano":"2026","mes":"01","receita":549.18,"com":71.39,"num":3,"canal":"Booking.com"},
  {"id_reserva":"120175071","alojamento":"apto 104 -G","hospede":"Laane Queiroz","chegada":"2026-01-02","partida":"2026-01-04","ano":"2026","mes":"01","receita":641.52,"com":83.4,"num":3,"canal":"Booking.com"},
  {"id_reserva":"120088811","alojamento":"apto 104 -G","hospede":"Kaio Rocha","chegada":"2026-01-06","partida":"2026-01-09","ano":"2026","mes":"01","receita":687.69,"com":89.4,"num":3,"canal":"Booking.com"},
  {"id_reserva":"120088231","alojamento":"apto 104 -G","hospede":"Adler Mota Magalhaes","chegada":"2026-02-19","partida":"2026-02-20","ano":"2026","mes":"02","receita":360.19,"com":46.82,"num":2,"canal":"Booking.com"},
  {"id_reserva":"120088226","alojamento":"Apto 201-H","hospede":"Tarcylla de Matos Nobre","chegada":"2026-02-19","partida":"2026-02-20","ano":"2026","mes":"02","receita":360.19,"com":46.82,"num":4,"canal":"Booking.com"},
  {"id_reserva":"120034326","alojamento":"Apto 102-C","hospede":"Felipe Gurgel","chegada":"2026-01-30","partida":"2026-02-01","ano":"2026","mes":"01","receita":1728.9,"com":224.76,"num":2,"canal":"Booking.com"},
  {"id_reserva":"119716351","alojamento":"apto 104 -G","hospede":"Roberto Carlos Gradin","chegada":"2026-01-09","partida":"2026-01-11","ano":"2026","mes":"01","receita":519.43,"com":67.53,"num":2,"canal":"Booking.com"},
  {"id_reserva":"119598261","alojamento":"Apto 103-F","hospede":"RENATO FAZZOLARI","chegada":"2026-01-26","partida":"2026-01-31","ano":"2026","mes":"01","receita":1576.8,"com":204.98,"num":1,"canal":"Booking.com"},
  {"id_reserva":"118383146","alojamento":"apto 104 -G","hospede":"Carlos Veras","chegada":"2026-01-16","partida":"2026-01-18","ano":"2026","mes":"01","receita":605.88,"com":78.76,"num":2,"canal":"Booking.com"},
  {"id_reserva":"118306576","alojamento":"apto 104 -G","hospede":"ferreira Gilmar","chegada":"2026-01-31","partida":"2026-02-01","ano":"2026","mes":"01","receita":400.95,"com":52.12,"num":4,"canal":"Booking.com"},
  {"id_reserva":"117924336","alojamento":"apto 104 -G","hospede":"Anderson Bandeira","chegada":"2026-01-04","partida":"2026-01-06","ano":"2026","mes":"01","receita":518.68,"com":67.43,"num":2,"canal":"Booking.com"},
  {"id_reserva":"117608916","alojamento":"Apto 102-C","hospede":"proprietarios carnaval","chegada":"2026-02-13","partida":"2026-02-18","ano":"2026","mes":"02","receita":0,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"117408766","alojamento":"Apto 103-F","hospede":"Maria Raquel Diniz Farias De Melo","chegada":"2026-01-05","partida":"2026-01-09","ano":"2026","mes":"01","receita":1098.36,"com":142.79,"num":2,"canal":"Booking.com"},
  {"id_reserva":"116881746","alojamento":"Apto 103-F","hospede":"Alexandre Rodrigues Silva","chegada":"2026-01-13","partida":"2026-01-18","ano":"2026","mes":"01","receita":1383.9,"com":179.91,"num":3,"canal":"Booking.com"},
  {"id_reserva":"116424861","alojamento":"Apto 103-F","hospede":"Leyrton José","chegada":"2026-01-09","partida":"2026-01-11","ano":"2026","mes":"01","receita":635.1,"com":82.56,"num":4,"canal":"Booking.com"},
  {"id_reserva":"115740386","alojamento":"Casa 2.5","hospede":"Proprietários","chegada":"2026-02-13","partida":"2026-02-18","ano":"2026","mes":"02","receita":0,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"115739831","alojamento":"Casa 2.7","hospede":"nos vamos","chegada":"2026-02-13","partida":"2026-02-18","ano":"2026","mes":"02","receita":0,"com":0,"num":1,"canal":"Direto"},
  {"id_reserva":"113412886","alojamento":"Casa 2.7","hospede":"Cleuz Vitoria Tontini","chegada":"2026-01-05","partida":"2026-01-07","ano":"2026","mes":"01","receita":2013.66,"com":261.78,"num":7,"canal":"Booking.com"},
  {"id_reserva":"113134976","alojamento":"Apto 201-H","hospede":"Palestina Dantas","chegada":"2026-01-04","partida":"2026-01-05","ano":"2026","mes":"01","receita":298.24,"com":38.77,"num":2,"canal":"Booking.com"},
  {"id_reserva":"109115711","alojamento":"Casa 2.7","hospede":"Ivna Borges","chegada":"2026-01-02","partida":"2026-01-04","ano":"2026","mes":"01","receita":3661.2,"com":475.96,"num":14,"canal":"Booking.com"},
  {"id_reserva":"109049586","alojamento":"Apto 103-F","hospede":"Cássio Xavier Silva","chegada":"2026-02-10","partida":"2026-02-11","ano":"2026","mes":"02","receita":331.37,"com":43.08,"num":3,"canal":"Booking.com"},
  {"id_reserva":"109049591","alojamento":"Apto 201-H","hospede":"Cássio Xavier Silva","chegada":"2026-02-10","partida":"2026-02-11","ano":"2026","mes":"02","receita":331.37,"com":43.08,"num":3,"canal":"Booking.com"},
  {"id_reserva":"105908471","alojamento":"Apto 102-C","hospede":"Diego Alves Silvaa","chegada":"2026-01-01","partida":"2026-01-04","ano":"2026","mes":"01","receita":1674,"com":304.88,"num":4,"canal":"Airbnb"},
  {"id_reserva":"104682123","alojamento":"Apto 201-H","hospede":"JEAN SILVA","chegada":"2026-01-01","partida":"2026-01-04","ano":"2026","mes":"01","receita":865.22,"com":112.48,"num":2,"canal":"Booking.com"},
  {"id_reserva":"102934268","alojamento":"Apto 103-F","hospede":"JEAN SILVA","chegada":"2026-01-01","partida":"2026-01-04","ano":"2026","mes":"01","receita":865.22,"com":112.48,"num":3,"canal":"Booking.com"},
  // Jean Castro — check-in 31/03/26, saída 01/04 → contabiliza em MARÇO (regra: mês do check-in)
  {"id_reserva":"132569062","alojamento":"apto 104 -G","hospede":"Jean Castro","chegada":"2026-03-31","partida":"2026-04-01","ano":"2026","mes":"03","receita":302.18,"com":0,"num":1,"canal":"Direto"}
];

async function main() {
    // Carregar unidades do banco
    const { data: unidades, error: errUn } = await db.from('unidades').select('id, nome');
    if (errUn || !unidades) { console.error('Erro ao carregar unidades:', errUn); process.exit(1); }
    console.log('Unidades no banco:', unidades.map(u => u.nome).join(', '));

    // Montar registros com unidade_id
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
    console.log(`Registros prontos para inserir: ${registros.length}/170`);

    // Deletar APENAS os id_reserva específicos (por unidade) - não apaga manual/MOVI
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

    // Inserir em lotes de 200
    let totalInserido = 0;
    for (let i = 0; i < registros.length; i += 200) {
        const lote = registros.slice(i, i + 200);
        const { data: ins, error: errIns } = await db.from('reservas').insert(lote).select('id');
        if (errIns) { console.error(`Erro insert lote ${i}:`, errIns); process.exit(1); }
        totalInserido += (ins?.length || 0);
        console.log(`Inseridos: ${totalInserido}/${registros.length}`);
    }

    // Verificação final
    const { data: verif } = await db.from('reservas')
        .select('id_reserva, mes_ano, unidade_id')
        .in('mes_ano', ['2025-12', '2026-01', '2026-02', '2026-03'])
        .not('id_reserva', 'like', 'MOVI%')
        .not('id_reserva', 'like', 'manual-%');
    console.log(`VERIFICACAO FINAL: ${verif?.length ?? 0} registros Smoobu Dez/2025+Jan-Mar/2026 no banco`);

    if ((verif?.length ?? 0) === registros.length) {
        console.log('SUCESSO! Todos os 170 registros estao presentes.');
    } else {
        console.warn(`ATENCAO: Esperado ${registros.length}, encontrado ${verif?.length ?? 0}`);
    }
}

main().catch(e => { console.error(e); process.exit(1); });
