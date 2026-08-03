/**
 * Fix TODOS os imóveis — Junho + Julho 2026
 * Fonte: BookingList20260804_1.xlsx (todos os aptos + casas)
 * Corrige receita e comissão erradas no banco para todos os imóveis.
 */

const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Variáveis ausentes'); process.exit(1); }
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// Chave unidade_key: número que identifica a unidade (bate com o nome no banco via regex)
const RESERVAS = [
    // === Apto 102-C ===
    { id_reserva: "141685192", unidade_key: "102", mes_ano: "2026-06", chegada: "2026-06-05", partida: "2026-06-08", hospede: "Josenilda Moreira", receita: 2322.00, comissao: 422.90, canal: "Airbnb", num_hospedes: 1 },
    { id_reserva: "142906122", unidade_key: "102", mes_ano: "2026-06", chegada: "2026-06-10", partida: "2026-06-12", hospede: "Cássio Penafiel Acosta", receita: 641.52, comissao: 83.40, canal: "Booking.com", num_hospedes: 2 },
    { id_reserva: "139533117", unidade_key: "102", mes_ano: "2026-06", chegada: "2026-06-12", partida: "2026-06-15", hospede: "Yohanna Ferreira forte", receita: 1400.00, comissao: 0, canal: "Direto", num_hospedes: 1 },
    { id_reserva: "144488641", unidade_key: "102", mes_ano: "2026-07", chegada: "2026-07-03", partida: "2026-07-05", hospede: "Marcelo tavares", receita: 1500.00, comissao: 0, canal: "Direto", num_hospedes: 4 },
    { id_reserva: "140585367", unidade_key: "102", mes_ano: "2026-07", chegada: "2026-07-05", partida: "2026-07-06", hospede: "Alan Muntadas", receita: 594.79, comissao: 77.32, canal: "Booking.com", num_hospedes: 4 },
    { id_reserva: "132514177", unidade_key: "102", mes_ano: "2026-07", chegada: "2026-07-06", partida: "2026-07-09", hospede: "Eduardo", receita: 2000.00, comissao: 0, canal: "Direto", num_hospedes: 1 },
    { id_reserva: "139901992", unidade_key: "102", mes_ano: "2026-07", chegada: "2026-07-10", partida: "2026-07-12", hospede: "Eduardo Mota dudu", receita: 1600.00, comissao: 0, canal: "Direto", num_hospedes: 1 },
    { id_reserva: "147522421", unidade_key: "102", mes_ano: "2026-07", chegada: "2026-07-15", partida: "2026-07-16", hospede: "Carla Andrade", receita: 216.11, comissao: 32.42, canal: "Booking.com", num_hospedes: 3 },
    { id_reserva: "144378271", unidade_key: "102", mes_ano: "2026-07", chegada: "2026-07-18", partida: "2026-07-19", hospede: "Dias Tomaz Renata", receita: 864.45, comissao: 112.38, canal: "Booking.com", num_hospedes: 4 },
    { id_reserva: "148080856", unidade_key: "102", mes_ano: "2026-07", chegada: "2026-07-19", partida: "2026-07-20", hospede: "ADRIANO MARQUES", receita: 559.80, comissao: 83.97, canal: "Booking.com", num_hospedes: 4 },
    { id_reserva: "146910481", unidade_key: "102", mes_ano: "2026-07", chegada: "2026-07-20", partida: "2026-07-22", hospede: "Raquel Pinheiro", receita: 706.00, comissao: 0, canal: "Airbnb", num_hospedes: 1 },
    { id_reserva: "149445936", unidade_key: "102", mes_ano: "2026-07", chegada: "2026-07-29", partida: "2026-07-30", hospede: "Ericko", receita: 314.00, comissao: 0, canal: "Direto", num_hospedes: 1 },
    { id_reserva: "149617926", unidade_key: "102", mes_ano: "2026-07", chegada: "2026-07-31", partida: "2026-08-01", hospede: "EDGAR XIMENES NETO", receita: 406.80, comissao: 61.02, canal: "Booking.com", num_hospedes: 4 },
    // === Apto 103-F ===
    { id_reserva: "140265877", unidade_key: "103", mes_ano: "2026-06", chegada: "2026-06-04", partida: "2026-06-07", hospede: "Fabio Leite", receita: 685.81, comissao: 89.16, canal: "Booking.com", num_hospedes: 2 },
    { id_reserva: "141418687", unidade_key: "103", mes_ano: "2026-06", chegada: "2026-06-07", partida: "2026-06-08", hospede: "junior andre", receita: 252.11, comissao: 32.77, canal: "Booking.com", num_hospedes: 2 },
    { id_reserva: "142734722", unidade_key: "103", mes_ano: "2026-06", chegada: "2026-06-09", partida: "2026-06-11", hospede: "Raquel Oliveira", receita: 330.48, comissao: 42.96, canal: "Booking.com", num_hospedes: 2 },
    { id_reserva: "139058402", unidade_key: "103", mes_ano: "2026-06", chegada: "2026-06-12", partida: "2026-06-14", hospede: "Gessica Maria Ferreira Souza", receita: 500.00, comissao: 0, canal: "Direto", num_hospedes: 4 },
    { id_reserva: "143514011", unidade_key: "103", mes_ano: "2026-06", chegada: "2026-06-15", partida: "2026-06-17", hospede: "Iara Florentino", receita: 366.12, comissao: 47.60, canal: "Booking.com", num_hospedes: 3 },
    { id_reserva: "143372921", unidade_key: "103", mes_ano: "2026-06", chegada: "2026-06-17", partida: "2026-06-19", hospede: "Leandro Sousa", receita: 476.00, comissao: 86.69, canal: "Airbnb", num_hospedes: 4 },
    { id_reserva: "140546877", unidade_key: "103", mes_ano: "2026-06", chegada: "2026-06-20", partida: "2026-06-22", hospede: "Antonio Pedro Olavo Lima Soares", receita: 456.39, comissao: 59.33, canal: "Booking.com", num_hospedes: 2 },
    { id_reserva: "144655891", unidade_key: "103", mes_ano: "2026-06", chegada: "2026-06-24", partida: "2026-06-25", hospede: "Beatriz", receita: 150.00, comissao: 0, canal: "Direto", num_hospedes: 1 },
    { id_reserva: "143850996", unidade_key: "103", mes_ano: "2026-06", chegada: "2026-06-25", partida: "2026-06-27", hospede: "Antônio Alves de Assis Junior", receita: 430.92, comissao: 56.02, canal: "Booking.com", num_hospedes: 4 },
    { id_reserva: "139760097", unidade_key: "103", mes_ano: "2026-06", chegada: "2026-06-27", partida: "2026-06-29", hospede: "Giselle Cysne", receita: 456.39, comissao: 59.33, canal: "Booking.com", num_hospedes: 2 },
    { id_reserva: "141397267", unidade_key: "103", mes_ano: "2026-06", chegada: "2026-06-29", partida: "2026-07-01", hospede: "Jonh Felipe Araujo Da Silva", receita: 403.38, comissao: 52.44, canal: "Booking.com", num_hospedes: 2 },
    { id_reserva: "145528376", unidade_key: "103", mes_ano: "2026-07", chegada: "2026-07-01", partida: "2026-07-03", hospede: "Roberta Gadelha Medina", receita: 549.18, comissao: 71.39, canal: "Booking.com", num_hospedes: 1 },
    { id_reserva: "145396421", unidade_key: "103", mes_ano: "2026-07", chegada: "2026-07-03", partida: "2026-07-04", hospede: "Vanessa Hiluy Lobo Felicio Vasconcelos", receita: 343.24, comissao: 44.62, canal: "Booking.com", num_hospedes: 4 },
    { id_reserva: "142187787", unidade_key: "103", mes_ano: "2026-07", chegada: "2026-07-04", partida: "2026-07-06", hospede: "Raíssa Cristina Brabo Dias", receita: 916.20, comissao: 119.11, canal: "Booking.com", num_hospedes: 7 },
    { id_reserva: "145706046", unidade_key: "103", mes_ano: "2026-07", chegada: "2026-07-06", partida: "2026-07-09", hospede: "Jonas Branco", receita: 764.10, comissao: 114.61, canal: "Booking.com", num_hospedes: 4 },
    { id_reserva: "139901922", unidade_key: "103", mes_ano: "2026-07", chegada: "2026-07-10", partida: "2026-07-12", hospede: "Eduardo Mota dudu", receita: 900.00, comissao: 0, canal: "Direto", num_hospedes: 1 },
    { id_reserva: "145825326", unidade_key: "103", mes_ano: "2026-07", chegada: "2026-07-12", partida: "2026-07-14", hospede: "Freitas karine", receita: 458.46, comissao: 68.77, canal: "Booking.com", num_hospedes: 4 },
    { id_reserva: "147445706", unidade_key: "103", mes_ano: "2026-07", chegada: "2026-07-14", partida: "2026-07-15", hospede: "ROGERIO DA SIlVA E SOUZA", receita: 228.83, comissao: 34.32, canal: "Booking.com", num_hospedes: 4 },
    { id_reserva: "147615296", unidade_key: "103", mes_ano: "2026-07", chegada: "2026-07-15", partida: "2026-07-16", hospede: "Rogério complemento", receita: 200.00, comissao: 0, canal: "Direto", num_hospedes: 1 },
    { id_reserva: "145706376", unidade_key: "103", mes_ano: "2026-07", chegada: "2026-07-16", partida: "2026-07-18", hospede: "Wesley", receita: 518.00, comissao: 0, canal: "Airbnb", num_hospedes: 1 },
    { id_reserva: "144378321", unidade_key: "103", mes_ano: "2026-07", chegada: "2026-07-18", partida: "2026-07-19", hospede: "Dias Tomaz Renata", receita: 486.73, comissao: 63.27, canal: "Booking.com", num_hospedes: 2 },
    { id_reserva: "145029206", unidade_key: "103", mes_ano: "2026-07", chegada: "2026-07-19", partida: "2026-07-23", hospede: "Hóspede do neto", receita: 1500.00, comissao: 0, canal: "Direto", num_hospedes: 1 },
    { id_reserva: "148109176", unidade_key: "103", mes_ano: "2026-07", chegada: "2026-07-23", partida: "2026-07-24", hospede: "Eric Souza Jucá", receita: 378.68, comissao: 56.80, canal: "Booking.com", num_hospedes: 4 },
    { id_reserva: "144253146", unidade_key: "103", mes_ano: "2026-07", chegada: "2026-07-24", partida: "2026-07-25", hospede: "Francisco Mendes Junior", receita: 378.68, comissao: 49.23, canal: "Booking.com", num_hospedes: 3 },
    { id_reserva: "146599011", unidade_key: "103", mes_ano: "2026-07", chegada: "2026-07-25", partida: "2026-07-27", hospede: "patricia santos", receita: 733.05, comissao: 109.96, canal: "Booking.com", num_hospedes: 4 },
    { id_reserva: "146746666", unidade_key: "103", mes_ano: "2026-07", chegada: "2026-07-28", partida: "2026-07-30", hospede: "Rebeca França Leitão", receita: 0, comissao: 0, canal: "Direto", num_hospedes: 1 },
    { id_reserva: "130746565", unidade_key: "103", mes_ano: "2026-07", chegada: "2026-07-30", partida: "2026-08-02", hospede: "Cristiano Büchling", receita: 1107.73, comissao: 144.00, canal: "Booking.com", num_hospedes: 3 },
    // === Apto 201-H ===
    { id_reserva: "141919177", unidade_key: "201", mes_ano: "2026-06", chegada: "2026-06-02", partida: "2026-06-03", hospede: "Daniele Andrade", receita: 224.10, comissao: 29.13, canal: "Booking.com", num_hospedes: 2 },
    { id_reserva: "139236717", unidade_key: "201", mes_ano: "2026-06", chegada: "2026-06-04", partida: "2026-06-07", hospede: "Danilo Marques moura", receita: 653.55, comissao: 84.96, canal: "Booking.com", num_hospedes: 2 },
    { id_reserva: "141797137", unidade_key: "201", mes_ano: "2026-06", chegada: "2026-06-07", partida: "2026-06-08", hospede: "silva luzerene", receita: 252.11, comissao: 32.77, canal: "Booking.com", num_hospedes: 4 },
    { id_reserva: "142608427", unidade_key: "201", mes_ano: "2026-06", chegada: "2026-06-08", partida: "2026-06-10", hospede: "Filipe Nery", receita: 330.48, comissao: 42.96, canal: "Booking.com", num_hospedes: 2 },
    { id_reserva: "142223537", unidade_key: "201", mes_ano: "2026-06", chegada: "2026-06-11", partida: "2026-06-12", hospede: "Raulino Emanuel", receita: 252.11, comissao: 32.77, canal: "Booking.com", num_hospedes: 2 },
    { id_reserva: "142694342", unidade_key: "201", mes_ano: "2026-06", chegada: "2026-06-12", partida: "2026-06-13", hospede: "Jhuly Caracas", receita: 318.38, comissao: 41.39, canal: "Booking.com", num_hospedes: 2 },
    { id_reserva: "142479257", unidade_key: "201", mes_ano: "2026-06", chegada: "2026-06-13", partida: "2026-06-14", hospede: "Jefferson Oliveira", receita: 286.54, comissao: 37.25, canal: "Booking.com", num_hospedes: 2 },
    { id_reserva: "142951972", unidade_key: "201", mes_ano: "2026-06", chegada: "2026-06-15", partida: "2026-06-16", hospede: "Socorro ribeiro", receita: 200.00, comissao: 0, canal: "Direto", num_hospedes: 1 },
    { id_reserva: "140462057", unidade_key: "201", mes_ano: "2026-06", chegada: "2026-06-17", partida: "2026-06-19", hospede: "matheus garcia", receita: 403.38, comissao: 52.44, canal: "Booking.com", num_hospedes: 2 },
    { id_reserva: "141278017", unidade_key: "201", mes_ano: "2026-06", chegada: "2026-06-20", partida: "2026-06-21", hospede: "Noeme", receita: 300.00, comissao: 0, canal: "Direto", num_hospedes: 1 },
    { id_reserva: "143734913", unidade_key: "201", mes_ano: "2026-06", chegada: "2026-06-21", partida: "2026-06-22", hospede: "Fernando Henrique", receita: 252.11, comissao: 32.77, canal: "Booking.com", num_hospedes: 2 },
    { id_reserva: "144351961", unidade_key: "201", mes_ano: "2026-06", chegada: "2026-06-23", partida: "2026-06-25", hospede: "ELIEZER GABRIEL DA SILVA", receita: 358.56, comissao: 46.61, canal: "Booking.com", num_hospedes: 4 },
    { id_reserva: "145140446", unidade_key: "201", mes_ano: "2026-06", chegada: "2026-06-28", partida: "2026-06-29", hospede: "Aline Bruno", receita: 238.11, comissao: 30.95, canal: "Booking.com", num_hospedes: 3 },
    { id_reserva: "144523846", unidade_key: "201", mes_ano: "2026-06", chegada: "2026-06-29", partida: "2026-07-02", hospede: "Alexandre Freire", receita: 677.97, comissao: 88.14, canal: "Booking.com", num_hospedes: 4 },
    { id_reserva: "145560806", unidade_key: "201", mes_ano: "2026-07", chegada: "2026-07-03", partida: "2026-07-05", hospede: "Patricia Oliveira", receita: 594.00, comissao: 108.19, canal: "Airbnb", num_hospedes: 2 },
    { id_reserva: "141260337", unidade_key: "201", mes_ano: "2026-07", chegada: "2026-07-05", partida: "2026-07-07", hospede: "Isangela de Oliveira Bandeira", receita: 500.00, comissao: 0, canal: "Direto", num_hospedes: 1 },
    { id_reserva: "146526771", unidade_key: "201", mes_ano: "2026-07", chegada: "2026-07-07", partida: "2026-07-08", hospede: "Jamil", receita: 250.00, comissao: 0, canal: "Direto", num_hospedes: 2 },
    { id_reserva: "145135341", unidade_key: "201", mes_ano: "2026-07", chegada: "2026-07-08", partida: "2026-07-09", hospede: "Samara Oliveira", receita: 324.17, comissao: 42.14, canal: "Booking.com", num_hospedes: 4 },
    { id_reserva: "146785576", unidade_key: "201", mes_ano: "2026-07", chegada: "2026-07-09", partida: "2026-07-10", hospede: "José freire", receita: 250.00, comissao: 0, canal: "Direto", num_hospedes: 1 },
    { id_reserva: "139901987", unidade_key: "201", mes_ano: "2026-07", chegada: "2026-07-10", partida: "2026-07-12", hospede: "Eduardo Mota dudu", receita: 900.00, comissao: 0, canal: "Direto", num_hospedes: 1 },
    { id_reserva: "141495607", unidade_key: "201", mes_ano: "2026-07", chegada: "2026-07-12", partida: "2026-07-20", hospede: "Carlos Austrália", receita: 2250.00, comissao: 0, canal: "Direto", num_hospedes: 1 },
    { id_reserva: "148266261", unidade_key: "201", mes_ano: "2026-07", chegada: "2026-07-20", partida: "2026-07-21", hospede: "Matheus Machado", receita: 356.40, comissao: 53.46, canal: "Booking.com", num_hospedes: 4 },
    { id_reserva: "148329896", unidade_key: "201", mes_ano: "2026-07", chegada: "2026-07-21", partida: "2026-07-22", hospede: "Rebeca Siqueira de Morais", receita: 378.68, comissao: 56.80, canal: "Booking.com", num_hospedes: 1 },
    { id_reserva: "148411916", unidade_key: "201", mes_ano: "2026-07", chegada: "2026-07-22", partida: "2026-07-23", hospede: "Jacklandson Veloso de Oliveira", receita: 356.40, comissao: 53.46, canal: "Booking.com", num_hospedes: 2 },
    { id_reserva: "148543696", unidade_key: "201", mes_ano: "2026-07", chegada: "2026-07-23", partida: "2026-07-24", hospede: "Beatriz", receita: 200.00, comissao: 0, canal: "Direto", num_hospedes: 1 },
    { id_reserva: "144477556", unidade_key: "201", mes_ano: "2026-07", chegada: "2026-07-24", partida: "2026-07-28", hospede: "Herlana Abreu", receita: 1557.00, comissao: 0, canal: "Direto", num_hospedes: 4 },
    { id_reserva: "147749721", unidade_key: "201", mes_ano: "2026-07", chegada: "2026-07-28", partida: "2026-07-31", hospede: "Matheus Nogueira", receita: 1168.17, comissao: 175.23, canal: "Booking.com", num_hospedes: 2 },
    { id_reserva: "129818895", unidade_key: "201", mes_ano: "2026-07", chegada: "2026-07-31", partida: "2026-08-04", hospede: "Emanuelle Spaggiari Souza", receita: 1557.90, comissao: 202.53, canal: "Booking.com", num_hospedes: 2 },
    // === Casa 2.5 ===
    { id_reserva: "135516757", unidade_key: "2.5", mes_ano: "2026-06", chegada: "2026-06-04", partida: "2026-06-07", hospede: "Germano", receita: 3000.00, comissao: 0, canal: "Direto", num_hospedes: 1 },
    { id_reserva: "141787187", unidade_key: "2.5", mes_ano: "2026-06", chegada: "2026-06-11", partida: "2026-06-12", hospede: "Rosangela Vai", receita: 0, comissao: 0, canal: "Direto", num_hospedes: 1 },
    { id_reserva: "143185476", unidade_key: "2.5", mes_ano: "2026-06", chegada: "2026-06-13", partida: "2026-06-14", hospede: "kindeli talvegue", receita: 549.18, comissao: 71.39, canal: "Booking.com", num_hospedes: 12 },
    { id_reserva: "144002551", unidade_key: "2.5", mes_ano: "2026-06", chegada: "2026-06-19", partida: "2026-06-21", hospede: "Pedro Gustavo", receita: 3000.00, comissao: 0, canal: "Direto", num_hospedes: 1 },
    { id_reserva: "144611256", unidade_key: "2.5", mes_ano: "2026-07", chegada: "2026-07-04", partida: "2026-07-07", hospede: "Antônio Macedo Coelho neto", receita: 3800.00, comissao: 0, canal: "Direto", num_hospedes: 1 },
    { id_reserva: "146389836", unidade_key: "2.5", mes_ano: "2026-07", chegada: "2026-07-10", partida: "2026-07-15", hospede: "Douglas Ramos", receita: 5359.59, comissao: 803.94, canal: "Booking.com", num_hospedes: 8 },
    { id_reserva: "147620541", unidade_key: "2.5", mes_ano: "2026-07", chegada: "2026-07-17", partida: "2026-07-19", hospede: "André Dantas", receita: 3200.00, comissao: 0, canal: "Direto", num_hospedes: 1 },
    { id_reserva: "149274956", unidade_key: "2.5", mes_ano: "2026-07", chegada: "2026-07-31", partida: "2026-08-03", hospede: "sabrina bento", receita: 3028.80, comissao: 454.32, canal: "Booking.com", num_hospedes: 14 },
    // === Casa 2.7 ===
    { id_reserva: "139902027", unidade_key: "2.7", mes_ano: "2026-07", chegada: "2026-07-10", partida: "2026-07-12", hospede: "proprietarios", receita: 0, comissao: 0, canal: "Direto", num_hospedes: 1 },
    { id_reserva: "147305991", unidade_key: "2.7", mes_ano: "2026-07", chegada: "2026-07-16", partida: "2026-07-20", hospede: "Brunna siqueira", receita: 6800.00, comissao: 0, canal: "Direto", num_hospedes: 1 },
    { id_reserva: "139656067", unidade_key: "2.7", mes_ano: "2026-07", chegada: "2026-07-31", partida: "2026-08-02", hospede: "Mendes Wefelnberg Joelma", receita: 3152.70, comissao: 409.85, canal: "Booking.com", num_hospedes: 15 },
    // === Apto 104-G ===
    { id_reserva: "141938597", unidade_key: "104", mes_ano: "2026-06", chegada: "2026-06-02", partida: "2026-06-03", hospede: "José tarcisio Neto", receita: 224.10, comissao: 29.13, canal: "Booking.com", num_hospedes: 2 },
    { id_reserva: "140115172", unidade_key: "104", mes_ano: "2026-06", chegada: "2026-06-04", partida: "2026-06-07", hospede: "Juan Dos Santos Mota Bezerra", receita: 778.00, comissao: 141.70, canal: "Airbnb", num_hospedes: 2 },
    { id_reserva: "141160182", unidade_key: "104", mes_ano: "2026-06", chegada: "2026-06-07", partida: "2026-06-12", hospede: "Willian Vai", receita: 1.00, comissao: 0, canal: "Direto", num_hospedes: 1 },
    { id_reserva: "140813287", unidade_key: "104", mes_ano: "2026-06", chegada: "2026-06-12", partida: "2026-06-14", hospede: "Espedito Pinheiro", receita: 540.00, comissao: 98.34, canal: "Airbnb", num_hospedes: 2 },
    { id_reserva: "141050027", unidade_key: "104", mes_ano: "2026-06", chegada: "2026-06-15", partida: "2026-06-18", hospede: "Maria Gabrielle", receita: 571.47, comissao: 74.29, canal: "Booking.com", num_hospedes: 4 },
    { id_reserva: "141684467", unidade_key: "104", mes_ano: "2026-06", chegada: "2026-06-19", partida: "2026-06-21", hospede: "Francisca Maria", receita: 458.46, comissao: 59.60, canal: "Booking.com", num_hospedes: 2 },
    { id_reserva: "136742237", unidade_key: "104", mes_ano: "2026-06", chegada: "2026-06-24", partida: "2026-07-04", hospede: "Rozania Pereira", receita: 2010.00, comissao: 0, canal: "Direto", num_hospedes: 1 },
    { id_reserva: "143841961", unidade_key: "104", mes_ano: "2026-07", chegada: "2026-07-06", partida: "2026-07-08", hospede: "Aline Rodrigues", receita: 570.70, comissao: 74.19, canal: "Booking.com", num_hospedes: 2 },
    { id_reserva: "140154437", unidade_key: "104", mes_ano: "2026-07", chegada: "2026-07-10", partida: "2026-07-12", hospede: "Thiago Rousseau", receita: 518.00, comissao: 0, canal: "Direto", num_hospedes: 1 },
    { id_reserva: "147138741", unidade_key: "104", mes_ano: "2026-07", chegada: "2026-07-12", partida: "2026-07-14", hospede: "jhulia Batista", receita: 486.00, comissao: 72.90, canal: "Booking.com", num_hospedes: 4 },
    { id_reserva: "147432806", unidade_key: "104", mes_ano: "2026-07", chegada: "2026-07-14", partida: "2026-07-15", hospede: "Raquel Menezes", receita: 228.83, comissao: 34.32, canal: "Booking.com", num_hospedes: 5 },
    { id_reserva: "147549821", unidade_key: "104", mes_ano: "2026-07", chegada: "2026-07-15", partida: "2026-07-16", hospede: "José tarcisio Neto", receita: 203.40, comissao: 30.51, canal: "Booking.com", num_hospedes: 2 },
    { id_reserva: "143905536", unidade_key: "104", mes_ano: "2026-07", chegada: "2026-07-16", partida: "2026-07-18", hospede: "Fábio Rodrigo Bezerra de Lima", receita: 570.24, comissao: 74.13, canal: "Booking.com", num_hospedes: 3 },
    { id_reserva: "136566347", unidade_key: "104", mes_ano: "2026-07", chegada: "2026-07-18", partida: "2026-07-21", hospede: "Juca queiroz feitosa", receita: 734.00, comissao: 0, canal: "Airbnb", num_hospedes: 1 },
    { id_reserva: "145829931", unidade_key: "104", mes_ano: "2026-07", chegada: "2026-07-21", partida: "2026-07-24", hospede: "Paulo Marcelo", receita: 962.28, comissao: 144.34, canal: "Booking.com", num_hospedes: 4 },
    { id_reserva: "146741316", unidade_key: "104", mes_ano: "2026-07", chegada: "2026-07-24", partida: "2026-07-26", hospede: "Ricardo Ângelo", receita: 600.00, comissao: 0, canal: "Direto", num_hospedes: 2 },
    { id_reserva: "149297351", unidade_key: "104", mes_ano: "2026-07", chegada: "2026-07-28", partida: "2026-07-29", hospede: "Beatriz", receita: 150.00, comissao: 0, canal: "Direto", num_hospedes: 1 },
    { id_reserva: "149423831", unidade_key: "104", mes_ano: "2026-07", chegada: "2026-07-29", partida: "2026-07-30", hospede: "Beatriz", receita: 150.00, comissao: 0, canal: "Direto", num_hospedes: 1 },
    { id_reserva: "149548491", unidade_key: "104", mes_ano: "2026-07", chegada: "2026-07-30", partida: "2026-07-31", hospede: "Aline Coelho", receita: 286.54, comissao: 42.98, canal: "Booking.com", num_hospedes: 4 },
    { id_reserva: "144467541", unidade_key: "104", mes_ano: "2026-07", chegada: "2026-07-31", partida: "2026-08-01", hospede: "Leonardo Albuquerque", receita: 250.00, comissao: 0, canal: "Direto", num_hospedes: 2 },
];

async function main() {
    console.log('🚀 Fix TODOS os imóveis jun+jul/2026 iniciado:', new Date().toISOString());
    console.log(`📋 ${RESERVAS.length} reservas a processar`);

    const { data: unidades, error: errUn } = await db.from('unidades').select('id, nome').not('nome', 'ilike', '%Movi%');
    if (errUn) throw new Error('Erro unidades: ' + errUn.message);
    console.log('🏠 Unidades:', unidades.map(u => u.nome).join(', '));

    // Montar mapa: chave numérica → unidade_id
    const mapaUnidade = {};
    for (const u of unidades) {
        const m = u.nome.match(/(\d+(?:\.\d+)?)/);
        if (m) mapaUnidade[m[1]] = u.id;
    }

    // Agrupar por unidade + mês para delete
    const porUnidadeMes = {};
    for (const r of RESERVAS) {
        const uid = mapaUnidade[r.unidade_key];
        if (!uid) { console.log(`⚠️ Unidade não encontrada para key=${r.unidade_key}`); continue; }
        const chave = `${uid}|${r.mes_ano}`;
        if (!porUnidadeMes[chave]) porUnidadeMes[chave] = { uid, mes_ano: r.mes_ano, nome: r.unidade_key };
    }

    // Deletar todos os registros de cada unidade+mês
    for (const { uid, mes_ano, nome } of Object.values(porUnidadeMes)) {
        const { error: errDel } = await db.from('reservas').delete().eq('unidade_id', uid).eq('mes_ano', mes_ano);
        if (errDel) throw new Error(`Erro ao apagar ${nome}/${mes_ano}: ${errDel.message}`);
        console.log(`🗑️ Apagado: ${nome} / ${mes_ano}`);
    }

    // Inserir todos os corretos
    const registros = RESERVAS.map(r => {
        const uid = mapaUnidade[r.unidade_key];
        if (!uid) return null;
        const [ano, mes] = r.mes_ano.split('-');
        return {
            id: randomUUID(), id_reserva: r.id_reserva, unidade_id: uid,
            ano, mes, mes_ano: r.mes_ano,
            chegada: r.chegada, partida: r.partida, hospede: r.hospede,
            receita: r.receita, comissao_portais: r.comissao, comissao_short_stay: 0,
            canal: r.canal, num_hospedes: r.num_hospedes, status: 'ativa',
        };
    }).filter(Boolean);

    const { error: errIns } = await db.from('reservas').insert(registros);
    if (errIns) throw new Error('Erro ao inserir: ' + errIns.message);

    console.log(`\n✅ ${registros.length} registros inseridos`);

    // Resumo por unidade
    for (const key of ['102','103','201','2.5','2.7','104']) {
        const sub = RESERVAS.filter(r => r.unidade_key === key);
        const rec = sub.reduce((s, r) => s + r.receita, 0);
        const com = sub.reduce((s, r) => s + r.comissao, 0);
        console.log(`  ${key}: ${sub.length} reservas | receita=R$${rec.toFixed(2)} | comissão=R$${com.toFixed(2)}`);
    }
    console.log('\n🎉 Concluído!');
}

main().catch(err => { console.error('❌ Erro fatal:', err.message); process.exit(1); });
