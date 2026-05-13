/**
 * Restaura dados de Janeiro, Fevereiro e Março de 2026
 * a partir do export do Booking (BookingList20260513_4.xlsx).
 *
 * Uso via GitHub Actions: Actions → Restaurar Jan-Mar 2026 → Run workflow
 */

const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('SUPABASE_URL e SUPABASE_ANON_KEY sao obrigatorios');
    process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// DD/MM/YY → YYYY-MM-DD
function parseDate(ddmmyy) {
    if (!ddmmyy) return null;
    const [d, m, y] = ddmmyy.split('/');
    return `20${y}-${m}-${d}`;
}

// Portal → canal
function mapCanal(portal) {
    if (!portal) return 'Direto';
    if (portal === 'Reserva directa') return 'Direto';
    return portal;
}

// Dados extraídos do export Booking (164 registros)
// Nota: 132569062 (Jean Castro, chegada 31/03) já está em Abril 2026 — não incluído
const DADOS = [
  { id_reserva:"105908471", unidade:"Apto 102-C", hospede:"Diego Alves Silvaa", cheg:"01/01/26", part:"04/01/26", receita:1674, com:304.88, portal:"Airbnb" },
  { id_reserva:"120759236", unidade:"Apto 102-C", hospede:"Carvalho Thais", cheg:"04/01/26", part:"06/01/26", receita:1119.60, com:145.55, portal:"Booking.com" },
  { id_reserva:"121191561", unidade:"Apto 102-C", hospede:"Maria socorro Moreira", cheg:"06/01/26", part:"07/01/26", receita:450, com:0, portal:"Reserva directa" },
  { id_reserva:"122527581", unidade:"Apto 102-C", hospede:"André Miranda", cheg:"16/01/26", part:"18/01/26", receita:1500, com:0, portal:"Reserva directa" },
  { id_reserva:"122727001", unidade:"Apto 102-C", hospede:"Vitória vai", cheg:"11/01/26", part:"16/01/26", receita:0, com:0, portal:"Reserva directa" },
  { id_reserva:"123224831", unidade:"Apto 102-C", hospede:"Hélcio Aguiar Sales", cheg:"09/01/26", part:"10/01/26", receita:629.78, com:81.87, portal:"Booking.com" },
  { id_reserva:"123313951", unidade:"Apto 102-C", hospede:"Lucas Anjos", cheg:"10/01/26", part:"11/01/26", receita:594.79, com:77.32, portal:"Booking.com" },
  { id_reserva:"124332666", unidade:"Apto 102-C", hospede:"Daniela Marquez De Lima", cheg:"24/01/26", part:"25/01/26", receita:864.45, com:112.38, portal:"Booking.com" },
  { id_reserva:"120034326", unidade:"Apto 102-C", hospede:"Felipe Gurgel", cheg:"30/01/26", part:"01/02/26", receita:1728.90, com:224.76, portal:"Booking.com" },
  { id_reserva:"117608916", unidade:"Apto 102-C", hospede:"proprietarios carnaval", cheg:"13/02/26", part:"18/02/26", receita:0, com:0, portal:"Reserva directa" },
  { id_reserva:"127581283", unidade:"Apto 102-C", hospede:"Erika Rodrigues", cheg:"19/02/26", part:"20/02/26", receita:594.79, com:77.32, portal:"Booking.com" },
  { id_reserva:"126521616", unidade:"Apto 102-C", hospede:"thiago rousseau", cheg:"07/02/26", part:"09/02/26", receita:1200, com:0, portal:"Reserva directa" },
  { id_reserva:"128933962", unidade:"Apto 102-C", hospede:"Anderson", cheg:"28/02/26", part:"01/03/26", receita:250, com:0, portal:"Reserva directa" },
  { id_reserva:"126130276", unidade:"Apto 102-C", hospede:"germano", cheg:"06/03/26", part:"08/03/26", receita:1200, com:0, portal:"Reserva directa" },
  { id_reserva:"126286426", unidade:"Apto 102-C", hospede:"Jean cruz ( ressarc problema hosp anterior )", cheg:"27/03/26", part:"29/03/26", receita:250, com:0, portal:"Reserva directa" },
  { id_reserva:"130075895", unidade:"Apto 102-C", hospede:"cleiriane pires (airbnb paulo )", cheg:"08/03/26", part:"09/03/26", receita:302, com:0, portal:"Reserva directa" },
  { id_reserva:"130936585", unidade:"Apto 102-C", hospede:"Jamil", cheg:"12/03/26", part:"13/03/26", receita:0, com:0, portal:"Reserva directa" },
  { id_reserva:"131036785", unidade:"Apto 102-C", hospede:"Nathalia Pereira", cheg:"22/03/26", part:"25/03/26", receita:1782, com:324.56, portal:"Airbnb" },
  { id_reserva:"131668690", unidade:"Apto 102-C", hospede:"Rian", cheg:"15/03/26", part:"16/03/26", receita:0, com:0, portal:"Reserva directa" },
  { id_reserva:"131911517", unidade:"Apto 102-C", hospede:"Guerreiro Marcos", cheg:"18/03/26", part:"21/03/26", receita:610.20, com:79.33, portal:"Booking.com" },
  { id_reserva:"132317547", unidade:"Apto 102-C", hospede:"Marcos ( complemento )", cheg:"21/03/26", part:"22/03/26", receita:350, com:0, portal:"Reserva directa" },
  { id_reserva:"102934268", unidade:"Apto 103-F", hospede:"JEAN SILVA", cheg:"01/01/26", part:"04/01/26", receita:865.22, com:112.48, portal:"Booking.com" },
  { id_reserva:"116424861", unidade:"Apto 103-F", hospede:"Leyrton José", cheg:"09/01/26", part:"11/01/26", receita:635.10, com:82.56, portal:"Booking.com" },
  { id_reserva:"116881746", unidade:"Apto 103-F", hospede:"Alexandre Rodrigues Silva", cheg:"13/01/26", part:"18/01/26", receita:1383.90, com:179.91, portal:"Booking.com" },
  { id_reserva:"117408766", unidade:"Apto 103-F", hospede:"Maria Raquel Diniz Farias De Melo", cheg:"05/01/26", part:"09/01/26", receita:1098.36, com:142.79, portal:"Booking.com" },
  { id_reserva:"121518856", unidade:"Apto 103-F", hospede:"Sara Santiago", cheg:"31/01/26", part:"01/02/26", receita:298, com:0, portal:"Reserva directa" },
  { id_reserva:"122077906", unidade:"Apto 103-F", hospede:"Elizabeth Araujo", cheg:"04/01/26", part:"05/01/26", receita:270.62, com:35.18, portal:"Booking.com" },
  { id_reserva:"122482086", unidade:"Apto 103-F", hospede:"Pinheiro Samia", cheg:"11/01/26", part:"13/01/26", receita:518.68, com:67.43, portal:"Booking.com" },
  { id_reserva:"123393351", unidade:"Apto 103-F", hospede:"CLIDENOR PAZ", cheg:"19/01/26", part:"20/01/26", receita:343.24, com:44.62, portal:"Booking.com" },
  { id_reserva:"123909496", unidade:"Apto 103-F", hospede:"César da Silva Xavier Patrícia Ferreira Barreto Xavier", cheg:"07/02/26", part:"09/02/26", receita:588, com:76.44, portal:"Booking.com" },
  { id_reserva:"124004596", unidade:"Apto 103-F", hospede:"Francisco Irisnan Melo", cheg:"23/01/26", part:"25/01/26", receita:605.88, com:78.76, portal:"Booking.com" },
  { id_reserva:"119598261", unidade:"Apto 103-F", hospede:"RENATO FAZZOLARI", cheg:"26/01/26", part:"31/01/26", receita:1576.80, com:204.98, portal:"Booking.com" },
  { id_reserva:"124623271", unidade:"Apto 103-F", hospede:"Rayssa Feitosa", cheg:"20/01/26", part:"21/01/26", receita:286.54, com:37.25, portal:"Booking.com" },
  { id_reserva:"109049586", unidade:"Apto 103-F", hospede:"Cássio Xavier Silva", cheg:"10/02/26", part:"11/02/26", receita:331.37, com:43.08, portal:"Booking.com" },
  { id_reserva:"124286156", unidade:"Apto 103-F", hospede:"Lindebergue Sena", cheg:"19/02/26", part:"22/02/26", receita:863.28, com:112.23, portal:"Booking.com" },
  { id_reserva:"126005501", unidade:"Apto 103-F", hospede:"Izabele Viana", cheg:"01/02/26", part:"03/02/26", receita:366.12, com:47.60, portal:"Booking.com" },
  { id_reserva:"126015681", unidade:"Apto 103-F", hospede:"Fabiano Reis", cheg:"14/02/26", part:"17/02/26", receita:2416.38, com:314.13, portal:"Booking.com" },
  { id_reserva:"126520461", unidade:"Apto 103-F", hospede:"Raquel Oliveira", cheg:"03/02/26", part:"05/02/26", receita:293.22, com:38.12, portal:"Booking.com" },
  { id_reserva:"126785961", unidade:"Apto 103-F", hospede:"Dennis de Boo", cheg:"05/02/26", part:"07/02/26", receita:277.20, com:36.04, portal:"Booking.com" },
  { id_reserva:"126974996", unidade:"Apto 103-F", hospede:"Janaina Monteiro", cheg:"11/02/26", part:"12/02/26", receita:216.11, com:28.09, portal:"Booking.com" },
  { id_reserva:"127573275", unidade:"Apto 103-F", hospede:"yago Neves", cheg:"12/02/26", part:"13/02/26", receita:228.83, com:29.75, portal:"Booking.com" },
  { id_reserva:"127829217", unidade:"Apto 103-F", hospede:"Fabiano complemento", cheg:"13/02/26", part:"14/02/26", receita:250, com:0, portal:"Reserva directa" },
  { id_reserva:"128197642", unidade:"Apto 103-F", hospede:"Marcelo Pereira", cheg:"23/02/26", part:"24/02/26", receita:254.70, com:33.11, portal:"Booking.com" },
  { id_reserva:"128375937", unidade:"Apto 103-F", hospede:"José tarcisio Neto", cheg:"18/02/26", part:"19/02/26", receita:216.11, com:28.09, portal:"Booking.com" },
  { id_reserva:"128684577", unidade:"Apto 103-F", hospede:"Danyelle Castelo", cheg:"25/02/26", part:"27/02/26", receita:498, com:90.70, portal:"Airbnb" },
  { id_reserva:"128831027", unidade:"Apto 103-F", hospede:"Marcelo Tavares", cheg:"22/02/26", part:"23/02/26", receita:228.83, com:29.75, portal:"Booking.com" },
  { id_reserva:"128987042", unidade:"Apto 103-F", hospede:"Rafaela Matos", cheg:"27/02/26", part:"01/03/26", receita:475.83, com:61.86, portal:"Booking.com" },
  { id_reserva:"129345907", unidade:"Apto 103-F", hospede:"Heloisa Helena", cheg:"07/03/26", part:"09/03/26", receita:412.29, com:53.60, portal:"Booking.com" },
  { id_reserva:"129808825", unidade:"Apto 103-F", hospede:"beatriz", cheg:"01/03/26", part:"02/03/26", receita:150, com:0, portal:"Reserva directa" },
  { id_reserva:"129930855", unidade:"Apto 103-F", hospede:"Beatriz", cheg:"02/03/26", part:"03/03/26", receita:60, com:0, portal:"Reserva directa" },
  { id_reserva:"130046530", unidade:"Apto 103-F", hospede:"Ryan", cheg:"03/03/26", part:"04/03/26", receita:100, com:0, portal:"Reserva directa" },
  { id_reserva:"130178760", unidade:"Apto 103-F", hospede:"Crislany Oliveira", cheg:"05/03/26", part:"07/03/26", receita:330.48, com:42.96, portal:"Booking.com" },
  { id_reserva:"130488850", unidade:"Apto 103-F", hospede:"André gurjao ( Josias )", cheg:"20/03/26", part:"22/03/26", receita:500, com:0, portal:"Reserva directa" },
  { id_reserva:"130900600", unidade:"Apto 103-F", hospede:"Emanoel Linhares", cheg:"11/03/26", part:"13/03/26", receita:458.46, com:59.60, portal:"Booking.com" },
  { id_reserva:"130979110", unidade:"Apto 103-F", hospede:"José tarcisio Neto", cheg:"10/03/26", part:"11/03/26", receita:254.70, com:33.11, portal:"Booking.com" },
  { id_reserva:"131247690", unidade:"Apto 103-F", hospede:"Rebeca França Leitão ( Amiga Do Pai /iguatemi)", cheg:"13/03/26", part:"15/03/26", receita:0, com:0, portal:"Reserva directa" },
  { id_reserva:"131292970", unidade:"Apto 103-F", hospede:"Tágila Ribeiro", cheg:"15/03/26", part:"17/03/26", receita:412.29, com:53.60, portal:"Booking.com" },
  { id_reserva:"131779805", unidade:"Apto 103-F", hospede:"Vitória Karen", cheg:"19/03/26", part:"20/03/26", receita:228.83, com:29.75, portal:"Booking.com" },
  { id_reserva:"131969242", unidade:"Apto 103-F", hospede:"Romário Silva", cheg:"18/03/26", part:"19/03/26", receita:180, com:0, portal:"Reserva directa" },
  { id_reserva:"128916242", unidade:"Apto 103-F", hospede:"Lindebergue Sena", cheg:"27/03/26", part:"29/03/26", receita:280, com:0, portal:"Reserva directa" },
  { id_reserva:"132425352", unidade:"Apto 103-F", hospede:"Rafael Mourão Rocha", cheg:"25/03/26", part:"27/03/26", receita:366.12, com:47.60, portal:"Booking.com" },
  { id_reserva:"132528452", unidade:"Apto 103-F", hospede:"ANDREY MOTA", cheg:"22/03/26", part:"23/03/26", receita:203.40, com:26.44, portal:"Booking.com" },
  { id_reserva:"132667802", unidade:"Apto 103-F", hospede:"andrey complemento", cheg:"23/03/26", part:"24/03/26", receita:100, com:0, portal:"Reserva directa" },
  { id_reserva:"132735717", unidade:"Apto 103-F", hospede:"Gabriela Alves", cheg:"24/03/26", part:"25/03/26", receita:216.11, com:28.09, portal:"Booking.com" },
  { id_reserva:"104682123", unidade:"Apto 201-H", hospede:"JEAN SILVA", cheg:"01/01/26", part:"04/01/26", receita:865.22, com:112.48, portal:"Booking.com" },
  { id_reserva:"109049591", unidade:"Apto 201-H", hospede:"Cássio Xavier Silva", cheg:"10/02/26", part:"11/02/26", receita:331.37, com:43.08, portal:"Booking.com" },
  { id_reserva:"113134976", unidade:"Apto 201-H", hospede:"Palestina Dantas", cheg:"04/01/26", part:"05/01/26", receita:298.24, com:38.77, portal:"Booking.com" },
  { id_reserva:"120475661", unidade:"Apto 201-H", hospede:"Mirela Fernandes", cheg:"13/01/26", part:"16/01/26", receita:900, com:0, portal:"Reserva directa" },
  { id_reserva:"120638996", unidade:"Apto 201-H", hospede:"Sara Costa de Holanda Sara", cheg:"08/01/26", part:"11/01/26", receita:865.22, com:112.48, portal:"Booking.com" },
  { id_reserva:"120757661", unidade:"Apto 201-H", hospede:"Paula Rivelly", cheg:"05/01/26", part:"07/01/26", receita:503.82, com:65.50, portal:"Booking.com" },
  { id_reserva:"120088226", unidade:"Apto 201-H", hospede:"Tarcylla de Matos Nobre", cheg:"19/02/26", part:"20/02/26", receita:360.19, com:46.82, portal:"Booking.com" },
  { id_reserva:"122371756", unidade:"Apto 201-H", hospede:"jefferson matheus nunes", cheg:"11/01/26", part:"13/01/26", receita:549.18, com:71.39, portal:"Booking.com" },
  { id_reserva:"122421501", unidade:"Apto 201-H", hospede:"Mabily Avelino", cheg:"24/01/26", part:"25/01/26", receita:396, com:51.48, portal:"Booking.com" },
  { id_reserva:"122788066", unidade:"Apto 201-H", hospede:"Paula complemento", cheg:"07/01/26", part:"08/01/26", receita:250, com:0, portal:"Reserva directa" },
  { id_reserva:"122822056", unidade:"Apto 201-H", hospede:"Tamyres Almeida Vieira Ribeiro", cheg:"18/01/26", part:"20/01/26", receita:648, com:118.02, portal:"Airbnb" },
  { id_reserva:"122903531", unidade:"Apto 201-H", hospede:"Emanuel Fernandes", cheg:"16/01/26", part:"18/01/26", receita:641.52, com:83.40, portal:"Booking.com" },
  { id_reserva:"123216561", unidade:"Apto 201-H", hospede:"Gabriel Gomes de Paiva", cheg:"22/01/26", part:"24/01/26", receita:562.28, com:73.10, portal:"Booking.com" },
  { id_reserva:"124218176", unidade:"Apto 201-H", hospede:"Júlia Matoso", cheg:"21/01/26", part:"22/01/26", receita:270.62, com:35.18, portal:"Booking.com" },
  { id_reserva:"124472271", unidade:"Apto 201-H", hospede:"Raphaela Soares", cheg:"01/02/26", part:"03/02/26", receita:549.18, com:71.39, portal:"Booking.com" },
  { id_reserva:"124614711", unidade:"Apto 201-H", hospede:"Tamyres complemento", cheg:"20/01/26", part:"21/01/26", receita:324, com:0, portal:"Reserva directa" },
  { id_reserva:"125011626", unidade:"Apto 201-H", hospede:"Patrícia Dantas", cheg:"25/01/26", part:"27/01/26", receita:503.82, com:65.50, portal:"Booking.com" },
  { id_reserva:"125394881", unidade:"Apto 201-H", hospede:"Nilton Cesar Vieira Silva", cheg:"06/02/26", part:"08/02/26", receita:673.20, com:87.52, portal:"Booking.com" },
  { id_reserva:"125493146", unidade:"Apto 201-H", hospede:"Júnior Alves", cheg:"30/01/26", part:"01/02/26", receita:641.52, com:83.40, portal:"Booking.com" },
  { id_reserva:"125549736", unidade:"Apto 201-H", hospede:"Giordano Forte", cheg:"27/01/26", part:"29/01/26", receita:648, com:118.02, portal:"Airbnb" },
  { id_reserva:"125855486", unidade:"Apto 201-H", hospede:"Mariana Farias", cheg:"20/02/26", part:"22/02/26", receita:619.20, com:80.50, portal:"Booking.com" },
  { id_reserva:"125893636", unidade:"Apto 201-H", hospede:"Elizângela", cheg:"29/01/26", part:"30/01/26", receita:180, com:0, portal:"Reserva directa" },
  { id_reserva:"126060706", unidade:"Apto 201-H", hospede:"Glauco Barreto", cheg:"14/02/26", part:"18/02/26", receita:3624.60, com:471.20, portal:"Booking.com" },
  { id_reserva:"126467381", unidade:"Apto 201-H", hospede:"Jonas Nygaard Hansen", cheg:"03/02/26", part:"05/02/26", receita:346, com:63.02, portal:"Airbnb" },
  { id_reserva:"126793831", unidade:"Apto 201-H", hospede:"Romildo Deodatto Júnior", cheg:"05/02/26", part:"06/02/26", receita:162.90, com:21.18, portal:"Booking.com" },
  { id_reserva:"127480423", unidade:"Apto 201-H", hospede:"Sandrine Mont'alverne", cheg:"11/02/26", part:"12/02/26", receita:250, com:0, portal:"Reserva directa" },
  { id_reserva:"127647102", unidade:"Apto 201-H", hospede:"Sandrine", cheg:"12/02/26", part:"13/02/26", receita:230, com:0, portal:"Reserva directa" },
  { id_reserva:"127711727", unidade:"Apto 201-H", hospede:"Igor Feitosa Magalhaes", cheg:"22/02/26", part:"24/02/26", receita:540, com:98.34, portal:"Airbnb" },
  { id_reserva:"127911572", unidade:"Apto 201-H", hospede:"Brenno Alecksander Rodrigues Paula", cheg:"18/02/26", part:"19/02/26", receita:171.16, com:22.25, portal:"Booking.com" },
  { id_reserva:"128155297", unidade:"Apto 201-H", hospede:"Victor Muñoz Larreta", cheg:"09/03/26", part:"16/03/26", receita:1712.30, com:222.60, portal:"Booking.com" },
  { id_reserva:"129984315", unidade:"Apto 201-H", hospede:"Shelly Ferreira", cheg:"08/03/26", part:"09/03/26", receita:228.83, com:29.75, portal:"Booking.com" },
  { id_reserva:"130221355", unidade:"Apto 201-H", hospede:"Danielle castelo", cheg:"05/03/26", part:"08/03/26", receita:500, com:0, portal:"Reserva directa" },
  { id_reserva:"130489440", unidade:"Apto 201-H", hospede:"Douglas", cheg:"27/03/26", part:"29/03/26", receita:500, com:0, portal:"Reserva directa" },
  { id_reserva:"132108632", unidade:"Apto 201-H", hospede:"Farah Jamil", cheg:"20/03/26", part:"21/03/26", receita:216.11, com:28.09, portal:"Booking.com" },
  { id_reserva:"132334902", unidade:"Apto 201-H", hospede:"Natasha Assumpção", cheg:"24/03/26", part:"25/03/26", receita:270.62, com:35.18, portal:"Booking.com" },
  { id_reserva:"133509032", unidade:"Apto 201-H", hospede:"Allan Júnior", cheg:"29/03/26", part:"30/03/26", receita:216.11, com:28.09, portal:"Booking.com" },
  { id_reserva:"133674432", unidade:"Apto 201-H", hospede:"Afrania Lorena Lima Pereira", cheg:"30/03/26", part:"31/03/26", receita:248.63, com:32.32, portal:"Booking.com" },
  { id_reserva:"109115711", unidade:"Casa 2.7", hospede:"Ivna Borges", cheg:"02/01/26", part:"04/01/26", receita:3661.20, com:475.96, portal:"Booking.com" },
  { id_reserva:"113412886", unidade:"Casa 2.7", hospede:"Cleuz Vitoria Tontini", cheg:"05/01/26", part:"07/01/26", receita:2013.66, com:261.78, portal:"Booking.com" },
  { id_reserva:"121936126", unidade:"Casa 2.7", hospede:"Sangiorgy de oliveira", cheg:"08/01/26", part:"11/01/26", receita:3538, com:0, portal:"Reserva directa" },
  { id_reserva:"122418101", unidade:"Casa 2.7", hospede:"Lorena Glauca", cheg:"16/01/26", part:"18/01/26", receita:3200, com:0, portal:"Reserva directa" },
  { id_reserva:"123497451", unidade:"Casa 2.7", hospede:"Nós vamos", cheg:"30/01/26", part:"01/02/26", receita:0, com:0, portal:"Reserva directa" },
  { id_reserva:"115739831", unidade:"Casa 2.7", hospede:"nos vamos", cheg:"13/02/26", part:"18/02/26", receita:0, com:0, portal:"Reserva directa" },
  { id_reserva:"129291342", unidade:"Casa 2.7", hospede:"Fxsurf Ximenes", cheg:"25/02/26", part:"28/02/26", receita:756, com:137.68, portal:"Airbnb" },
  { id_reserva:"126670376", unidade:"Casa 2.7", hospede:"Oswaldo Schreder Junior", cheg:"01/03/26", part:"08/03/26", receita:1462, com:0, portal:"Airbnb" },
  { id_reserva:"129459785", unidade:"Casa 2.7", hospede:"Romário Silva", cheg:"09/03/26", part:"11/03/26", receita:1500, com:0, portal:"Reserva directa" },
  { id_reserva:"131265895", unidade:"Casa 2.7", hospede:"Romário complemento", cheg:"11/03/26", part:"12/03/26", receita:750, com:0, portal:"Reserva directa" },
  { id_reserva:"129444655", unidade:"Casa 2.7", hospede:"Suellen Ribeiro", cheg:"13/03/26", part:"15/03/26", receita:1901.80, com:247.23, portal:"Booking.com" },
  { id_reserva:"131541095", unidade:"Casa 2.7", hospede:"Diego Silva arruda", cheg:"19/03/26", part:"22/03/26", receita:2370, com:0, portal:"Reserva directa" },
  { id_reserva:"121749691", unidade:"Casa 2.5", hospede:"Alan Kardek", cheg:"15/01/26", part:"18/01/26", receita:0, com:0, portal:"Reserva directa" },
  { id_reserva:"122356246", unidade:"Casa 2.5", hospede:"Aline Cavalcante", cheg:"08/01/26", part:"11/01/26", receita:0, com:0, portal:"Reserva directa" },
  { id_reserva:"125012536", unidade:"Casa 2.5", hospede:"Dorival Ferreira", cheg:"23/01/26", part:"25/01/26", receita:1767.42, com:229.76, portal:"Booking.com" },
  { id_reserva:"115740386", unidade:"Casa 2.5", hospede:"Proprietários", cheg:"13/02/26", part:"18/02/26", receita:0, com:0, portal:"Reserva directa" },
  { id_reserva:"130613070", unidade:"Casa 2.5", hospede:"FRANCISCO EMANUEL NUNES", cheg:"27/03/26", part:"29/03/26", receita:1728.90, com:224.76, portal:"Booking.com" },
  { id_reserva:"130672895", unidade:"Casa 2.5", hospede:"aquiles gadelha ponte", cheg:"20/03/26", part:"22/03/26", receita:1383.12, com:179.81, portal:"Booking.com" },
  { id_reserva:"131227255", unidade:"Casa 2.5", hospede:"Crislany Oliveira", cheg:"14/03/26", part:"16/03/26", receita:1464.48, com:190.38, portal:"Booking.com" },
  { id_reserva:"117924336", unidade:"apto 104 -G", hospede:"Anderson Bandeira", cheg:"04/01/26", part:"06/01/26", receita:518.68, com:67.43, portal:"Booking.com" },
  { id_reserva:"118383146", unidade:"apto 104 -G", hospede:"Carlos Veras", cheg:"16/01/26", part:"18/01/26", receita:605.88, com:78.76, portal:"Booking.com" },
  { id_reserva:"119716351", unidade:"apto 104 -G", hospede:"Roberto Carlos Gradin", cheg:"09/01/26", part:"11/01/26", receita:519.43, com:67.53, portal:"Booking.com" },
  { id_reserva:"120088811", unidade:"apto 104 -G", hospede:"Kaio Rocha", cheg:"06/01/26", part:"09/01/26", receita:687.69, com:89.40, portal:"Booking.com" },
  { id_reserva:"120175071", unidade:"apto 104 -G", hospede:"Laane Queiroz", cheg:"02/01/26", part:"04/01/26", receita:641.52, com:83.40, portal:"Booking.com" },
  { id_reserva:"120438326", unidade:"apto 104 -G", hospede:"Thiago Freitas", cheg:"14/01/26", part:"16/01/26", receita:549.18, com:71.39, portal:"Booking.com" },
  { id_reserva:"121590341", unidade:"apto 104 -G", hospede:"Dr. Carmem", cheg:"19/01/26", part:"23/01/26", receita:1200, com:0, portal:"Reserva directa" },
  { id_reserva:"121829886", unidade:"apto 104 -G", hospede:"Renato Gomes Barreto", cheg:"01/01/26", part:"02/01/26", receita:324.17, com:42.14, portal:"Booking.com" },
  { id_reserva:"122485946", unidade:"apto 104 -G", hospede:"Higina Rosa Brito Nunes", cheg:"11/01/26", part:"13/01/26", receita:610.20, com:79.33, portal:"Booking.com" },
  { id_reserva:"123416066", unidade:"apto 104 -G", hospede:"Alessandra Araujo Farias", cheg:"27/02/26", part:"01/03/26", receita:657.90, com:85.53, portal:"Booking.com" },
  { id_reserva:"124101156", unidade:"apto 104 -G", hospede:"Pedro", cheg:"23/01/26", part:"25/01/26", receita:624, com:0, portal:"Reserva directa" },
  { id_reserva:"124153901", unidade:"apto 104 -G", hospede:"Tiara Roberto Araruna", cheg:"18/01/26", part:"19/01/26", receita:286.54, com:37.25, portal:"Booking.com" },
  { id_reserva:"125018401", unidade:"apto 104 -G", hospede:"Priscila Dos santos martins", cheg:"25/01/26", part:"27/01/26", receita:475.83, com:61.86, portal:"Booking.com" },
  { id_reserva:"125243606", unidade:"apto 104 -G", hospede:"Barbara banida", cheg:"30/01/26", part:"31/01/26", receita:350, com:0, portal:"Airbnb" },
  { id_reserva:"125661146", unidade:"apto 104 -G", hospede:"Elisângela Costa", cheg:"27/01/26", part:"29/01/26", receita:345.78, com:44.95, portal:"Booking.com" },
  { id_reserva:"125825126", unidade:"apto 104 -G", hospede:"guillermo cremona", cheg:"29/01/26", part:"30/01/26", receita:216.11, com:28.09, portal:"Booking.com" },
  { id_reserva:"118306576", unidade:"apto 104 -G", hospede:"ferreira Gilmar", cheg:"31/01/26", part:"01/02/26", receita:400.95, com:52.12, portal:"Booking.com" },
  { id_reserva:"120088231", unidade:"apto 104 -G", hospede:"Adler Mota Magalhaes", cheg:"19/02/26", part:"20/02/26", receita:360.19, com:46.82, portal:"Booking.com" },
  { id_reserva:"122379971", unidade:"apto 104 -G", hospede:"Proprietários", cheg:"13/02/26", part:"18/02/26", receita:0, com:0, portal:"Reserva directa" },
  { id_reserva:"122601866", unidade:"apto 104 -G", hospede:"MATEUS SAMPAIO ANDRADE ROCHA DE HOLANDA FARIAS", cheg:"20/02/26", part:"22/02/26", receita:688, com:89.44, portal:"Booking.com" },
  { id_reserva:"122608676", unidade:"apto 104 -G", hospede:"Fernando gall", cheg:"06/02/26", part:"08/02/26", receita:518, com:0, portal:"Reserva directa" },
  { id_reserva:"126267156", unidade:"apto 104 -G", hospede:"Livia Nojosa Nojosa", cheg:"01/02/26", part:"03/02/26", receita:432, com:78.68, portal:"Airbnb" },
  { id_reserva:"126447596", unidade:"apto 104 -G", hospede:"Fabiano Wilians Wilians Satis Taner", cheg:"08/02/26", part:"11/02/26", receita:585, com:106.55, portal:"Airbnb" },
  { id_reserva:"126549646", unidade:"apto 104 -G", hospede:"Miriam Paris", cheg:"03/02/26", part:"04/02/26", receita:195.08, com:25.36, portal:"Booking.com" },
  { id_reserva:"126694401", unidade:"apto 104 -G", hospede:"Ignacio Giordano", cheg:"04/02/26", part:"06/02/26", receita:293.76, com:38.19, portal:"Booking.com" },
  { id_reserva:"127173231", unidade:"apto 104 -G", hospede:"Paulo Fernando Silva Ribeiro", cheg:"12/02/26", part:"13/02/26", receita:181.23, com:23.56, portal:"Booking.com" },
  { id_reserva:"127512131", unidade:"apto 104 -G", hospede:"Francisca Janete Alves Araújo", cheg:"11/02/26", part:"12/02/26", receita:228.83, com:29.75, portal:"Booking.com" },
  { id_reserva:"128660892", unidade:"apto 104 -G", hospede:"Jenyffer kelly Floriano", cheg:"25/02/26", part:"27/02/26", receita:421.20, com:54.76, portal:"Booking.com" },
  { id_reserva:"128875132", unidade:"apto 104 -G", hospede:"Noeme", cheg:"22/02/26", part:"23/02/26", receita:200, com:0, portal:"Reserva directa" },
  { id_reserva:"129025357", unidade:"apto 104 -G", hospede:"Jorge Luiz Lima Felix", cheg:"23/02/26", part:"24/02/26", receita:228.83, com:29.75, portal:"Booking.com" },
  { id_reserva:"123770106", unidade:"apto 104 -G", hospede:"Walber ( amigo Lorena )", cheg:"13/03/26", part:"15/03/26", receita:0, com:0, portal:"Reserva directa" },
  { id_reserva:"129188952", unidade:"apto 104 -G", hospede:"Valdenizia de freitas araujo", cheg:"27/03/26", part:"29/03/26", receita:440, com:0, portal:"Reserva directa" },
  { id_reserva:"130047380", unidade:"apto 104 -G", hospede:"Fernanda ( Josias )", cheg:"03/03/26", part:"05/03/26", receita:400, com:0, portal:"Reserva directa" },
  { id_reserva:"130238780", unidade:"apto 104 -G", hospede:"Ricardo Souza", cheg:"06/03/26", part:"08/03/26", receita:458.46, com:59.60, portal:"Booking.com" },
  { id_reserva:"130335290", unidade:"apto 104 -G", hospede:"Criskelly", cheg:"05/03/26", part:"06/03/26", receita:160, com:0, portal:"Reserva directa" },
  { id_reserva:"130492110", unidade:"apto 104 -G", hospede:"Samira Alves Braga", cheg:"20/03/26", part:"21/03/26", receita:286.54, com:37.25, portal:"Booking.com" },
  { id_reserva:"130872435", unidade:"apto 104 -G", hospede:"Rachel Berg", cheg:"10/03/26", part:"12/03/26", receita:345.78, com:44.95, portal:"Booking.com" },
  { id_reserva:"130900755", unidade:"apto 104 -G", hospede:"Jaiane Duarte", cheg:"15/03/26", part:"16/03/26", receita:228.83, com:29.75, portal:"Booking.com" },
  { id_reserva:"130998040", unidade:"apto 104 -G", hospede:"Rafaela Matos", cheg:"12/03/26", part:"13/03/26", receita:216.11, com:28.09, portal:"Booking.com" },
  { id_reserva:"131258285", unidade:"apto 104 -G", hospede:"Maria do Socorro Ribeiro", cheg:"17/03/26", part:"18/03/26", receita:286.54, com:37.25, portal:"Booking.com" },
  { id_reserva:"131638305", unidade:"apto 104 -G", hospede:"Francisco Afonso de Paiva Junior", cheg:"19/03/26", part:"20/03/26", receita:254.70, com:33.11, portal:"Booking.com" },
  { id_reserva:"131912062", unidade:"apto 104 -G", hospede:"Tabata Do Carmo", cheg:"21/03/26", part:"22/03/26", receita:270.62, com:35.18, portal:"Booking.com" },
];

async function main() {
    console.log('Restauracao Jan-Mar 2026 iniciada');
    console.log('Total de registros:', DADOS.length);

    const { data: unidades, error: errUn } = await db.from('unidades').select('id, nome');
    if (errUn) throw new Error('Erro unidades: ' + errUn.message);

    const mapaExato = {};
    const mapaNorm = {};
    unidades.forEach(u => {
        mapaExato[u.nome] = u.id;
        mapaExato[u.nome.toLowerCase()] = u.id;
        const norm = u.nome.toLowerCase().replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ').trim();
        mapaNorm[norm] = u.id;
    });
    console.log('Unidades encontradas:', unidades.map(u => u.nome).join(', '));

    function findUnidadeId(nome) {
        if (mapaExato[nome]) return mapaExato[nome];
        if (mapaExato[nome.toLowerCase()]) return mapaExato[nome.toLowerCase()];
        const norm = nome.toLowerCase().replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ').trim();
        if (mapaNorm[norm]) return mapaNorm[norm];
        const numMatch = nome.match(/(\d+(?:\.\d+)?)/);
        if (numMatch) {
            const found = unidades.find(u => {
                const uNum = u.nome.match(/(\d+(?:\.\d+)?)/);
                return uNum && uNum[1] === numMatch[1];
            });
            if (found) return found.id;
        }
        return null;
    }

    const unidadesNomes = ['Apto 102-C', 'Apto 103-F', 'Apto 201-H', 'Casa 2.5', 'Casa 2.7', 'apto 104 -G'];
    console.log('Limpando registros Jan-Mar 2026 existentes...');
    for (const nomeUn of unidadesNomes) {
        const uid = findUnidadeId(nomeUn);
        if (uid) {
            for (const mesAno of ['2026-01', '2026-02', '2026-03']) {
                const { error: e } = await db.from('reservas').delete().eq('mes_ano', mesAno).eq('unidade_id', uid);
                if (e) console.warn(`Aviso ao limpar ${nomeUn} ${mesAno}:`, e.message);
            }
            console.log('Limpo:', nomeUn);
        } else {
            console.warn('Unidade nao encontrada para limpeza:', nomeUn);
        }
    }

    const paraInserir = DADOS.map(r => {
        const unidade_id = findUnidadeId(r.unidade);
        if (!unidade_id) { console.warn('Unidade nao encontrada:', r.unidade); return null; }
        const mesNum = r.cheg.split('/')[1];
        const mesAno = `2026-${mesNum}`;
        return {
            id: randomUUID(),
            id_reserva: String(r.id_reserva),
            unidade_id,
            ano: '2026',
            mes: mesNum,
            mes_ano: mesAno,
            receita: r.receita || 0,
            comissao_portais: r.com || 0,
            comissao_short_stay: 0,
            status: 'ativa',
        };
    }).filter(Boolean);

    console.log('Registros para inserir:', paraInserir.length);

    const porMes = {};
    paraInserir.forEach(r => { porMes[r.mes_ano] = (porMes[r.mes_ano] || 0) + 1; });
    Object.entries(porMes).sort().forEach(([m, c]) => console.log(`  ${m}: ${c} registros`));

    for (let i = 0; i < paraInserir.length; i += 500) {
        const lote = paraInserir.slice(i, i + 500);
        const { error: e } = await db.from('reservas').insert(lote);
        if (e) throw new Error('Erro ao inserir: ' + e.message);
        console.log(`Inseridos: ${Math.min(i + 500, paraInserir.length)}/${paraInserir.length}`);
    }

    console.log('Restauracao Jan-Mar 2026 concluida!');
}

main().catch(err => { console.error('Erro fatal:', err.message); process.exit(1); });
