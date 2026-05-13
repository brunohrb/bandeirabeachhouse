/**
 * Service Worker — Bandeira Stay Manager (PWA)
 *
 * Estratégia: Network-first com cache fallback.
 * Cacheia assets estáticos para funcionar offline/app-like no Safari.
 */

const CACHE_NAME = 'bandeira-stay-v11';

// Usa URLs relativas ao SW (resolvem corretamente em GitHub Pages com subpath).
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './movi.html',
    './logo-nobg.png',
    './manifest.webmanifest',
    'https://code.jquery.com/jquery-3.6.0.min.js',
    'https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css',
    'https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
];

// HOTFIX v11: o syncSmoobuRealtime no index.html tem bug que apaga TODOS registros
// do mes_ano atual quando o calendario eh aberto. Esse script injeta no HTML uma
// versao corrigida que so apaga os id_reserva especificos que serao reinseridos.
const HOTFIX_SCRIPT = `<script>
(function(){
    let tries = 0;
    const intervalId = setInterval(() => {
        if (typeof window.syncSmoobuRealtime === 'function' && typeof window.db !== 'undefined') {
            clearInterval(intervalId);
            console.log('[HOTFIX v11] aplicando patch em syncSmoobuRealtime');
            window.syncSmoobuRealtime = async function() {
                if (window.calSyncing) return;
                window.calSyncing = true;
                const btn = document.getElementById('calSyncBtn');
                const icon = document.getElementById('calSyncIcon');
                if (btn) btn.classList.add('syncing');
                if (icon) icon.style.animation = 'spin 1s linear infinite';
                try {
                    const mesStr = String(window.calMes + 1).padStart(2, '0');
                    const from = window.calAno + '-' + mesStr + '-01';
                    const diasNoMes = new Date(window.calAno, window.calMes + 1, 0).getDate();
                    const to = window.calAno + '-' + mesStr + '-' + diasNoMes;
                    const { data: unidades, error: errUn } = await window.db.from('unidades').select('id, nome');
                    if (errUn || !unidades || unidades.length === 0) {
                        console.warn('[HOTFIX] sync abortado: nao foi possivel carregar unidades');
                        return;
                    }
                    const mapaUnidades = {};
                    unidades.forEach(u => {
                        mapaUnidades[u.nome.toLowerCase()] = u.id;
                        const num = u.nome.match(/(\\d+(?:\\.\\d+)?)/);
                        if (num) mapaUnidades['_num_' + num[1]] = u.id;
                    });
                    function findUnidadeId(nome) {
                        const lower = (nome || '').toLowerCase();
                        if (mapaUnidades[lower]) return mapaUnidades[lower];
                        const num = (nome || '').match(/(\\d+(?:\\.\\d+)?)/);
                        if (num && mapaUnidades['_num_' + num[1]]) return mapaUnidades['_num_' + num[1]];
                        return null;
                    }
                    let todasReservas = [];
                    let page = 1, totalPages = 1;
                    while (page <= totalPages) {
                        const resultado = await window.chamarEdgeFunction({ action: 'getReservations', from, to, page });
                        todasReservas.push(...(resultado.reservas || []));
                        totalPages = resultado.pageCount || 1;
                        page++;
                    }
                    if (todasReservas.length === 0) return;
                    const registros = todasReservas.map(r => {
                        const uid = findUnidadeId(r.unidade);
                        if (!uid) return null;
                        const [ano, mes] = (r.chegada || '').split('-');
                        return {
                            id_reserva: r.id, unidade_id: uid, ano, mes, mes_ano: ano + '-' + mes,
                            receita: r.receita || 0, comissao_portais: r.comissao || 0,
                            comissao_short_stay: 0, status: r.status || 'ativa',
                            hospede: r.hospede, chegada: r.chegada, partida: r.partida,
                            num_hospedes: r.numHospedes || 1, canal: r.canal || 'Direto'
                        };
                    }).filter(Boolean);
                    if (registros.length === 0) return;
                    // FIX: deletar APENAS os id_reserva especificos
                    for (const u of unidades) {
                        if (u.nome.toLowerCase().includes('movi')) continue;
                        const idsUni = registros.filter(r => r.unidade_id === u.id).map(r => r.id_reserva);
                        if (idsUni.length === 0) continue;
                        for (let i = 0; i < idsUni.length; i += 200) {
                            const loteIds = idsUni.slice(i, i + 200);
                            await window.db.from('reservas').delete().eq('unidade_id', u.id).in('id_reserva', loteIds);
                        }
                    }
                    for (let i = 0; i < registros.length; i += 500) {
                        await window.db.from('reservas').insert(registros.slice(i, i + 500));
                    }
                    if (typeof window.carregarReservasSupabase === 'function') await window.carregarReservasSupabase();
                    if (typeof window.carregarReservasCalendario === 'function') window.carregarReservasCalendario();
                    if (typeof window.renderCalendario === 'function') window.renderCalendario();
                } catch (e) {
                    console.error('[HOTFIX] erro sync:', e);
                } finally {
                    window.calSyncing = false;
                    if (btn) btn.classList.remove('syncing');
                    if (icon) icon.style.animation = '';
                }
            };
        }
        if (++tries > 200) clearInterval(intervalId);
    }, 100);
})();
</script>`;

// Install: cacheia assets estáticos (ignora falhas individuais pra não travar o SW)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log('[SW] Cacheando assets...');
            await Promise.all(ASSETS_TO_CACHE.map(url =>
                cache.add(url).catch(err => console.warn('[SW] Falhou cache de', url, err))
            ));
        })
    );
    self.skipWaiting();
});

// Activate: limpa caches antigos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) =>
            Promise.all(
                names
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            )
        )
    );
    self.clients.claim();
});

// Push: receber notificação quando app está fechado
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Bandeira Stay';
    const options = {
        body: data.body || '',
        icon: '/logo-nobg.png',
        badge: '/logo-nobg.png',
        tag: data.tag || 'bandeira-notif',
        renotify: true,
        data: data.payload || {},
        actions: data.type === 'message' ? [
            { action: 'reply', title: '↩ Responder' },
            { action: 'dismiss', title: 'Fechar' }
        ] : []
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

// Clique na notificação → abrir app na tab correta
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const payload = event.notification.data || {};
    const action = event.action;

    if (action === 'dismiss') return;

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            const existing = clientList.find(c => c.url && c.url.includes(self.location.origin));
            if (existing) {
                existing.focus();
                if (payload.type === 'message') {
                    existing.postMessage({ type: 'MSG_CLICK', dados: payload });
                }
            } else {
                // Abre relativo ao scope do SW (funciona em GitHub Pages com subpath)
                const target = new URL('./', self.registration.scope).href;
                self.clients.openWindow(target).then(win => {
                    if (win && payload.type === 'message') {
                        setTimeout(() => win.postMessage({ type: 'MSG_CLICK', dados: payload }), 1500);
                    }
                });
            }
        })
    );
});

// Fetch: network-first para API, cache-first para assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Requests para Supabase/Smoobu sempre vão para a rede (dados em tempo real)
    if (url.hostname.includes('supabase') || url.hostname.includes('smoobu')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Detecta requests para o HTML principal (index.html, /, navegação)
    const accept = event.request.headers.get('accept') || '';
    const isHTMLNav = event.request.mode === 'navigate' ||
        accept.includes('text/html') ||
        url.pathname.endsWith('/index.html') ||
        url.pathname.endsWith('/');

    if (isHTMLNav) {
        // Para HTML: busca da rede, injeta hotfix, NUNCA cacheia versão modificada
        event.respondWith(
            fetch(event.request)
                .then(async (response) => {
                    if (!response.ok) return response;
                    const ct = response.headers.get('content-type') || '';
                    if (!ct.includes('text/html')) return response;
                    const text = await response.text();
                    const modified = text.includes('</body>')
                        ? text.replace('</body>', HOTFIX_SCRIPT + '</body>')
                        : text + HOTFIX_SCRIPT;
                    return new Response(modified, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers
                    });
                })
                .catch(() => caches.match(event.request).then((cached) => {
                    if (cached) return cached;
                    return caches.match('./index.html') || caches.match('./') || new Response('Offline', { status: 503 });
                }))
        );
        return;
    }

    // Para outros assets: tenta rede primeiro, se falhar usa cache
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then((cached) => {
                    if (cached) return cached;
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html') || caches.match('./');
                    }
                    return new Response('Offline', { status: 503 });
                });
            })
    );
});
