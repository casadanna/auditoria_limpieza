const CACHE_NAME = 'casa-danna-v5';

self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    // No interceptar llamadas al macro de Google Apps Script
    if (e.request.url.includes('script.google.com') || e.request.url.includes('script.googleusercontent.com')) {
        return;
    }
    
    // Solo cacheamos peticiones GET
    if (e.request.method !== 'GET') {
        return;
    }

    const url = new URL(e.request.url);

    // Para el HTML o el Manifest, siempre buscar en la red primero (Network First)
    // Esto asegura que si Vercel sube una nueva versión, el index.html se actualice y 
    // no pida los archivos CSS viejos (evitando el error 404).
    if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/manifest.json') {
        e.respondWith(
            fetch(e.request)
                .then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                    return response;
                })
                .catch(() => caches.match(e.request)) // Si no hay internet, usar la versión guardada
        );
        return;
    }

    // Para los recursos como CSS, JS o imágenes, usar Caché primero y sino Red (Cache First)
    e.respondWith(
        caches.match(e.request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(e.request).then(response => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                }
                return response;
            }).catch(() => {
                // Ignorar error si falla por no haber internet y es un archivo no guardado
            });
        })
    );
});
