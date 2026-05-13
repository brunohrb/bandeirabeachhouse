/**
 * Restaura dados históricos a partir do backup Excel mais antigo disponível.
 * Restaura todos os meses anteriores ao mês atual (o sync do Smoobu cuida do mês atual em diante).
 *
 * Uso: GitHub Actions → "Restaurar Histórico Completo" → Run workflow
 */

const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('SUPABASE_URL e SUPABASE_ANON_KEY sao obrigatorios');
    process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    // Usa o backup mais antigo disponível
    const backupsDir = path.join(__dirname, '..', 'backups');
    const files = fs.readdirSync(backupsDir).filter(f => f.endsWith('.xlsx')).sort();
    if (files.length === 0) throw new Error('Nenhum backup encontrado em ' + backupsDir);

    const backupFile = path.join(backupsDir, files[0]);
    console.log('Usando backup:', files[0]);

    const wb = XLSX.readFile(backupFile);
    const ws = wb.Sheets['Reservas'] || wb.Sheets[wb.SheetNames[0]];
    const dataRows = XLSX.utils.sheet_to_json(ws);
    console.log('Total de registros no backup:', dataRows.length);

    // Mês atual — sync do Smoobu cuida daqui em diante
    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    console.log(`Restaurando meses anteriores a ${mesAtual} (exclusive)`);

    // Busca unidades do Supabase
    const { data: unidades, error: errUn } = await db.from('unidades').select('id, nome');
    if (errUn) throw new Error('Erro unidades: ' + errUn.message);

    const mapaExato = {};
    const mapaNorm = {};
    unidades.forEach(u => {
        mapaExato[u.nome] = u.id;
        const norm = u.nome.toLowerCase().replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ').trim();
        mapaNorm[norm] = u.id;
    });
    console.log('Unidades:', unidades.map(u => u.nome).join(', '));

    function findUnidadeId(nome) {
        if (!nome) return null;
        if (mapaExato[nome]) return mapaExato[nome];
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

    // Filtra registros históricos do backup
    const records = dataRows.filter(r => {
        const id = String(r['ID Reserva'] || '').trim();
        const mesAno = String(r['Mês/Ano'] || '').trim();
        if (!id || !mesAno) return false;
        if (id.startsWith('MOVI_') || id.startsWith('manual-')) return false;
        return mesAno < mesAtual;
    });

    console.log(`\nRegistros históricos a restaurar: ${records.length}`);
    const porMes = {};
    records.forEach(r => {
        const m = String(r['Mês/Ano']);
        porMes[m] = (porMes[m] || 0) + 1;
    });
    Object.entries(porMes).sort().forEach(([m, c]) => console.log(`  ${m}: ${c} registros`));

    // Apaga registros existentes por id_reserva (corrige unidade_ids errados)
    const ids = records.map(r => String(r['ID Reserva']).trim());
    console.log('\nApagando registros antigos...');
    for (let i = 0; i < ids.length; i += 200) {
        const batch = ids.slice(i, i + 200);
        const { error: e } = await db.from('reservas').delete().in('id_reserva', batch);
        if (e) console.warn('Aviso delete:', e.message);
    }
    console.log('Registros antigos apagados.');

    // Monta registros para inserção
    const paraInserir = records.map(r => {
        const unidadeNome = String(r['Unidade'] || '').trim();
        const unidade_id = findUnidadeId(unidadeNome);
        if (!unidade_id) { console.warn('Unidade nao encontrada:', unidadeNome); return null; }
        const mesAno = String(r['Mês/Ano'] || '').trim();
        return {
            id: randomUUID(),
            id_reserva: String(r['ID Reserva']).trim(),
            unidade_id,
            ano: mesAno.substring(0, 4),
            mes: mesAno.substring(5, 7),
            mes_ano: mesAno,
            receita: parseFloat(r['Receita'] || 0) || 0,
            comissao_portais: parseFloat(r['Comissão Portais'] || 0) || 0,
            comissao_short_stay: parseFloat(r['Comissão Short Stay'] || 0) || 0,
            status: String(r['Status'] || 'ativa').toLowerCase(),
            hospede: r['Hóspede'] || null,
            chegada: r['Chegada'] || null,
            partida: r['Partida'] || null,
            num_hospedes: parseInt(r['Nº Hóspedes'] || 1) || 1,
            canal: r['Canal'] || null,
        };
    }).filter(Boolean);

    console.log(`\nInserindo ${paraInserir.length} registros...`);

    async function inserirLotes(dados) {
        for (let i = 0; i < dados.length; i += 500) {
            const lote = dados.slice(i, i + 500);
            const { error: e } = await db.from('reservas').insert(lote);
            if (e) throw e;
            console.log(`  ${Math.min(i + 500, dados.length)}/${dados.length}`);
        }
    }

    try {
        await inserirLotes(paraInserir);
    } catch (e) {
        if (e.message && e.message.includes('column')) {
            console.warn('Colunas extras ausentes no schema — tentando sem hospede/chegada/canal...');
            const semDetalhes = paraInserir.map(r => ({
                id: r.id, id_reserva: r.id_reserva, unidade_id: r.unidade_id,
                ano: r.ano, mes: r.mes, mes_ano: r.mes_ano,
                receita: r.receita, comissao_portais: r.comissao_portais,
                comissao_short_stay: r.comissao_short_stay, status: r.status,
            }));
            await inserirLotes(semDetalhes);
        } else {
            throw new Error('Erro ao inserir: ' + e.message);
        }
    }

    console.log('\nRestauracao historica concluida!');
}

main().catch(err => { console.error('Erro fatal:', err.message); process.exit(1); });
