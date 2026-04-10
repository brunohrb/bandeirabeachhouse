/**
 * Service Worker — Bandeira Stay Manager (PWA)
 *
 * Estratégia: Network-first com cache fallback.
 * Cacheia assets estáticos para funcionar offline/app-like no Safari.
 */

const CACHE_NAME = 'bandeira-stay-v1';

const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/logo-nobg.png',
    '/manifest.webmanifest',
    'https://code.jquery.com/jquery-3.6.0.min.js',
    'https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css',
    'https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
];

// Install: cacheia assets estáticos
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Cacheando assets...');
            return cache.addAll(ASSETS_TO_CACHE);
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
                    // Fallback para navegação: retorna index.html do cache
                    if (event.request.mode === 'navigate') {
                        return caches.match('/index.html');
                    }
                    return new Response('Offline', { status: 503 });
                });
            })
    );
});
