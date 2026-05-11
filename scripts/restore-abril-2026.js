/**
 * Script de restauração de dados de Abril 2026
 * Recuperado a partir dos backups diários do repositório.
 *
 * Uso via GitHub Actions: Actions → Restaurar Dados Abril 2026 → Run workflow
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

const DADOS_103F_201H = [
  // --- Apto 103-F ---
  { id_reserva:"130663375", unidade:"Apto 103-F", hospede:"Paula", chegada:"2026-04-25", partida:"2026-04-26", receita:300, canal:"Booking.com", status:"ativa", num_hospedes:1 },
  { id_reserva:"132103302", unidade:"Apto 103-F", hospede:"Francisco Beloiano", chegada:"2026-04-06", partida:"2026-04-12", receita:0, canal:"Booking.com", status:"ativa", num_hospedes:1 },
  { id_reserva:"132750357", unidade:"Apto 103-F", hospede:"Carolina Guilheme Ramalho", chegada:"2026-04-02", partida:"2026-04-05", receita:0, canal:"Booking.com", status:"ativa", num_hospedes:1 },
  { id_reserva:"134472602", unidade:"Apto 103-F", hospede:"Jose Tarcisio Neto", chegada:"2026-04-06", partida:"2026-04-07", receita:0, canal:"Booking.com", status:"ativa", num_hospedes:3 },
  { id_reserva:"134523217", unidade:"Apto 103-F", hospede:"Andreia Andreia Pereira Jesus", chegada:"2026-04-15", partida:"2026-04-19", receita:1080, canal:"Airbnb", status:"ativa", num_hospedes:2 },
  { id_reserva:"134625082", unidade:"Apto 103-F", hospede:"Ala Diogenes", chegada:"2026-04-12", partida:"2026-04-13", receita:0, canal:"Booking.com", status:"ativa", num_hospedes:3 },
  { id_reserva:"134664517", unidade:"Apto 103-F", hospede:"Moises", chegada:"2026-04-19", partida:"2026-04-20", receita:302, canal:"Direto", status:"ativa", num_hospedes:4 },
  { id_reserva:"134668762", unidade:"Apto 103-F", hospede:"Bia", chegada:"2026-04-07", partida:"2026-04-08", receita:0, canal:"Direto", status:"ativa", num_hospedes:1 },
  { id_reserva:"134721772", unidade:"Apto 103-F", hospede:"Beatriz", chegada:"2026-04-08", partida:"2026-04-09", receita:0, canal:"Direto", status:"ativa", num_hospedes:1 },
  { id_reserva:"135379887", unidade:"Apto 103-F", hospede:"Marcelo Bezerra", chegada:"2026-04-13", partida:"2026-04-14", receita:216.11, canal:"Booking.com", status:"ativa", num_hospedes:2 },
  { id_reserva:"136366072", unidade:"Apto 103-F", hospede:"Luciana Gadelha Miranda", chegada:"2026-04-24", partida:"2026-04-25", receita:203.40, canal:"Booking.com", status:"ativa", num_hospedes:2 },
  { id_reserva:"136774597", unidade:"Apto 103-F", hospede:"Thais Marques Bezerra", chegada:"2026-04-24", partida:"2026-04-25", receita:216.11, canal:"Booking.com", status:"ativa", num_hospedes:4 },
  { id_reserva:"136996692", unidade:"Apto 103-F", hospede:"", chegada:"2026-04-28", partida:"2026-04-29", receita:286.54, canal:"", status:"cancelada", num_hospedes:1 },
  // --- Apto 201-H ---
  { id_reserva:"122430666", unidade:"Apto 201-H", hospede:"", chegada:"2026-04-01", partida:"2026-04-02", receita:641.52, canal:"", status:"cancelada", num_hospedes:1 },
  { id_reserva:"132158962", unidade:"Apto 201-H", hospede:"Saionara Oliveira Martins", chegada:"2026-04-10", partida:"2026-04-12", receita:0, canal:"Direto", status:"ativa", num_hospedes:6 },
  { id_reserva:"132808017", unidade:"Apto 201-H", hospede:"", chegada:"2026-04-01", partida:"2026-04-02", receita:456.88, canal:"", status:"cancelada", num_hospedes:1 },
  { id_reserva:"133327857", unidade:"Apto 201-H", hospede:"Ramon Sousa", chegada:"2026-04-02", partida:"2026-04-05", receita:0, canal:"Booking.com", status:"ativa", num_hospedes:2 },
  { id_reserva:"134235227", unidade:"Apto 201-H", hospede:"", chegada:"2026-04-01", partida:"2026-04-02", receita:480.96, canal:"", status:"cancelada", num_hospedes:1 },
  { id_reserva:"134438242", unidade:"Apto 201-H", hospede:"NORONHA JANF", chegada:"2026-04-06", partida:"2026-04-08", receita:0, canal:"Booking.com", status:"ativa", num_hospedes:2 },
  { id_reserva:"134734032", unidade:"Apto 201-H", hospede:"ELIEZER GABRIEL DA SILVA JUNIOR", chegada:"2026-04-12", partida:"2026-04-13", receita:0, canal:"Booking.com", status:"ativa", num_hospedes:3 },
  { id_reserva:"134748767", unidade:"Apto 201-H", hospede:"Felipe Alberto Gomes da Cunha", chegada:"2026-04-08", partida:"2026-04-09", receita:0, canal:"Booking.com", status:"ativa", num_hospedes:2 },
  { id_reserva:"135471512", unidade:"Apto 201-H", hospede:"Felipe Marinho", chegada:"2026-04-15", partida:"2026-04-17", receita:380.98, canal:"Booking.com", status:"ativa", num_hospedes:1 },
  { id_reserva:"135578437", unidade:"Apto 201-H", hospede:"Renato Silva", chegada:"2026-04-18", partida:"2026-04-19", receita:381.38, canal:"Booking.com", status:"ativa", num_hospedes:2 },
  { id_reserva:"135679547", unidade:"Apto 201-H", hospede:"Daisy Leite Vieira Silva", chegada:"2026-04-20", partida:"2026-04-21", receita:254.70, canal:"Booking.com", status:"ativa", num_hospedes:2 },
  { id_reserva:"135803057", unidade:"Apto 201-H", hospede:"Romario Silva", chegada:"2026-04-17", partida:"2026-04-18", receita:250, canal:"Direto", status:"ativa", num_hospedes:2 },
  { id_reserva:"135962197", unidade:"Apto 201-H", hospede:"Sergio Coelho Sobrinho", chegada:"2026-04-19", partida:"2026-04-20", receita:216.11, canal:"Booking.com", status:"ativa", num_hospedes:2 },
  { id_reserva:"136241262", unidade:"Apto 201-H", hospede:"Alan David", chegada:"2026-04-21", partida:"2026-04-22", receita:254.25, canal:"Booking.com", status:"ativa", num_hospedes:3 },
  { id_reserva:"136278567", unidade:"Apto 201-H", hospede:"Adilane Braga", chegada:"2026-04-25", partida:"2026-04-26", receita:346.50, canal:"Booking.com", status:"ativa", num_hospedes:2 },
];

async function main() {
    console.log('Restauracao de Abril 2026 iniciada');

    const { data: unidades, error: errUn } = await db.from('unidades').select('id, nome');
    if (errUn) throw new Error('Erro unidades: ' + errUn.message);

    const mapaUnidades = {};
    unidades.forEach(u => {
        mapaUnidades[u.nome] = u.id;
        mapaUnidades[u.nome.toLowerCase()] = u.id;
        const norm = u.nome.toLowerCase().replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ').trim();
        mapaUnidades[norm] = u.id;
        const num = u.nome.match(/(\d+(?:\.\d+)?)/);
        if (num) mapaUnidades['_num_' + num[1]] = u.id;
    });

    function findUnidadeId(nome) {
        if (mapaUnidades[nome]) return mapaUnidades[nome];
        if (mapaUnidades[nome.toLowerCase()]) return mapaUnidades[nome.toLowerCase()];
        const norm = nome.toLowerCase().replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ').trim();
        if (mapaUnidades[norm]) return mapaUnidades[norm];
        const num = nome.match(/(\d+(?:\.\d+)?)/);
        if (num && mapaUnidades['_num_' + num[1]]) return mapaUnidades['_num_' + num[1]];
        return null;
    }

    const DADOS_OUTRAS = require('./restore-abril-outras.json');
    const todosDados = [...DADOS_103F_201H, ...DADOS_OUTRAS];
    console.log('Total de registros a processar:', todosDados.length);

    const { data: existentes } = await db.from('reservas')
        .select('id_reserva').eq('mes_ano', '2026-04');
    const idsExistentes = new Set((existentes || []).map(r => String(r.id_reserva)));
    console.log('Ja existem no banco para Abril 2026:', idsExistentes.size);

    function montarRegistro(r, comDetalhes) {
        const unidade_id = findUnidadeId(r.unidade);
        if (!unidade_id) { console.warn('Unidade nao encontrada:', r.unidade); return null; }
        const base = {
            id: randomUUID(),
            id_reserva: String(r.id_reserva),
            unidade_id,
            ano: '2026', mes: '04', mes_ano: '2026-04',
            receita: r.receita || 0,
            comissao_portais: r.comissao_portais || 0,
            comissao_short_stay: 0,
            status: r.status || 'ativa',
        };
        if (comDetalhes) {
            base.hospede = r.hospede || null;
            base.chegada = r.chegada || null;
            base.partida = r.partida || null;
            base.num_hospedes = r.num_hospedes || 1;
            base.canal = r.canal || 'Direto';
        }
        return base;
    }

    const paraInserir = todosDados
        .filter(r => !idsExistentes.has(String(r.id_reserva)))
        .map(r => montarRegistro(r, true))
        .filter(Boolean);

    console.log('Registros para inserir:', paraInserir.length);

    const semReceita = paraInserir.filter(r => !r.receita);
    if (semReceita.length > 0) {
        console.log('ATENCAO: ' + semReceita.length + ' com receita=0 (corrigir manualmente):');
        semReceita.forEach(r => console.log('  -', r.id_reserva, r.hospede || ''));
    }

    if (paraInserir.length === 0) {
        console.log('Nada a inserir - todos os registros ja existem.'); return;
    }

    async function inserirLotes(dados) {
        for (let i = 0; i < dados.length; i += 500) {
            const lote = dados.slice(i, i + 500);
            const { error: e } = await db.from('reservas').insert(lote);
            if (e) throw e;
            console.log('Inseridos: ' + Math.min(i + 500, dados.length) + '/' + dados.length);
        }
    }

    try {
        await inserirLotes(paraInserir);
    } catch (e) {
        if (e.message && e.message.includes('column')) {
            console.log('Colunas extras nao existem no Supabase — tentando sem hospede/chegada/partida/canal...');
            const semDetalhes = todosDados
                .filter(r => !idsExistentes.has(String(r.id_reserva)))
                .map(r => montarRegistro(r, false))
                .filter(Boolean);
            await inserirLotes(semDetalhes);
        } else {
            throw new Error('Erro ao inserir: ' + e.message);
        }
    }

    console.log('Restauracao concluida!');
    if (semReceita.length > 0)
        console.log('Atualize os ' + semReceita.length + ' registros com receita=0 no Supabase Dashboard.');
}

main().catch(err => { console.error('Erro fatal:', err.message); process.exit(1); });
