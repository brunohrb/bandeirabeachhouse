/**
 * Service Worker — Bandeira Stay Manager (PWA)
 *
 * Estratégia: Network-first com cache fallback.
 * Cacheia assets estáticos para funcionar offline/app-like no Safari.
 */

const CACHE_NAME = 'bandeira-stay-v7';

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

    // Para assets: tenta rede primeiro, se falhar usa cache
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cacheia a resposta fresca
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Offline: tenta o cache
                return caches.match(event.request).then((cached) => {
                    if (cached) return cached;
                    // Fallback para navegação: retorna index.html do cache (relativo ao scope)
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html') || caches.match('./');
                    }
                    return new Response('Offline', { status: 503 });
                });
            })
    );
});
