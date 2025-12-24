const CACHE_NAME = 'cafepos-v1';

const urlsToCache = [
    '/',
    '/dashboard',
    '/icon-192.png',
    '/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            // Cache each URL individually to prevent one failure from breaking all
            const cachePromises = urlsToCache.map(async (url) => {
                try {
                    await cache.add(url);
                    console.log(`Cached: ${url}`);
                } catch (error) {
                    console.warn(`Failed to cache ${url}:`, error);
                    // Continue even if one URL fails
                }
            });

            await Promise.allSettled(cachePromises);
            console.log('Service worker installation complete');
        })
    );

    // Force the waiting service worker to become the active service worker
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );

    // Take control of all pages immediately
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                return response;
            }

            // Clone the request
            const fetchRequest = event.request.clone();

            return fetch(fetchRequest).then((response) => {
                // Check if valid response
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                // Clone the response
                const responseToCache = response.clone();

                // Cache the fetched response for future use
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return response;
            }).catch((error) => {
                console.error('Fetch failed:', error);
                throw error;
            });
        })
    );
});
