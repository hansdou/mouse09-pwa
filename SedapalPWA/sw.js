const CACHE_NAME = 'sedapal-pwa-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/sedapal-api.js',
    '/manifest.json',
    '/icons/icon.svg',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

// Instalar Service Worker
self.addEventListener('install', function(event) {
    console.log('🔧 Service Worker: Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('📦 Service Worker: Cache abierto');
                return cache.addAll(urlsToCache);
            })
    );
});

// Interceptar requests
self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                // Cache hit - devolver respuesta del cache
                if (response) {
                    console.log('📄 Service Worker: Sirviendo desde cache:', event.request.url);
                    return response;
                }

                // Si no está en cache, hacer fetch normal
                console.log('🌐 Service Worker: Fetch desde red:', event.request.url);
                return fetch(event.request).then(function(response) {
                    // Verificar si recibimos una respuesta válida
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clonar la respuesta
                    var responseToCache = response.clone();

                    caches.open(CACHE_NAME)
                        .then(function(cache) {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                });
            })
    );
});

// Activar Service Worker
self.addEventListener('activate', function(event) {
    console.log('✅ Service Worker: Activado');
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Service Worker: Eliminando cache viejo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Escuchar mensajes
self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});