/**
 * Daily Backup — Bandeira Beach House
 *
 * Gera um Excel com todas as reservas, despesas, proprietários e categorias
 * do Supabase e salva em backups/Backup_Bandeira_YYYY-MM-DD.xlsx
 * (commitado no repo pelo workflow).
 *
 * Roda 1x por dia via GitHub Actions.
 */

const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ SUPABASE_URL ou SUPABASE_ANON_KEY ausentes');
    process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchAll(table, select = '*') {
    const pageSize = 1000;
    let from = 0;
    const all = [];
    while (true) {
        const { data, error } = await db
            .from(table)
            .select(select)
            .range(from, from + pageSize - 1);
        if (error) throw new Error(`${table}: ${error.message}`);
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
    }
    return all;
}

async function main() {
    console.log('🔵 Iniciando backup diário...');

    const [reservas, despesas, unidades] = await Promise.all([
        fetchAll('reservas'),
        fetchAll('despesas').catch(() => []),
        fetchAll('unidades').catch(() => []),
    ]);

    console.log(`📦 Reservas: ${reservas.length} • Despesas: ${despesas.length} • Unidades: ${unidades.length}`);

    // Mapa unidade_id → nome, para enriquecer reservas
    const mapaUnidades = {};
    unidades.forEach(u => { mapaUnidades[u.id] = u.nome; });

    const reservasExport = reservas.map(r => ({
        'ID Reserva': r.id_reserva,
        'Unidade': mapaUnidades[r.unidade_id] || r.unidade_id,
        'Hóspede': r.hospede || '',
        'Chegada': r.chegada || '',
        'Partida': r.partida || '',
        'Ano': r.ano,
        'Mês': r.mes,
        'Mês/Ano': r.mes_ano,
        'Receita': r.receita || 0,
        'Comissão Portais': r.comissao_portais || 0,
        'Comissão Short Stay': r.comissao_short_stay || 0,
        'Canal': r.canal || '',
        'Status': r.status || '',
        'Nº Hóspedes': r.num_hospedes || 1,
    }));

    const despesasExport = despesas.map(d => ({
        'ID': d.id,
        'Unidade': mapaUnidades[d.unidade_id] || d.unidade || '',
        'Descrição': d.descricao,
        'Categoria': d.categoria,
        'Data': d.data,
        'Valor': d.valor,
    }));

    const unidadesExport = unidades.map(u => ({
        'ID': u.id,
        'Nome': u.nome,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reservasExport), 'Reservas');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(despesasExport), 'Despesas');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(unidadesExport), 'Unidades');

    const hoje = new Date().toISOString().slice(0, 10);
    const backupsDir = path.resolve(__dirname, '..', 'backups');
    if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

    const filePath = path.join(backupsDir, `Backup_Bandeira_${hoje}.xlsx`);
    XLSX.writeFile(wb, filePath);
    console.log(`✅ Backup salvo em: backups/Backup_Bandeira_${hoje}.xlsx`);

    // Mantém apenas os 30 backups mais recentes (rolling window)
    const arquivos = fs.readdirSync(backupsDir)
        .filter(f => f.startsWith('Backup_Bandeira_') && f.endsWith('.xlsx'))
        .sort();
    const MAX_BACKUPS = 30;
    if (arquivos.length > MAX_BACKUPS) {
        const remover = arquivos.slice(0, arquivos.length - MAX_BACKUPS);
        remover.forEach(f => {
            fs.unlinkSync(path.join(backupsDir, f));
            console.log(`🗑️  Removido backup antigo: ${f}`);
        });
    }
}

main().catch(err => {
    console.error('❌ Erro no backup:', err);
    process.exit(1);
});
