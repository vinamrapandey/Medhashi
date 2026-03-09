/* ============================================
   AS WEDDING — Service Worker
   Cache-first for assets, network-first for API
   ============================================ */

const CACHE_NAME = 'as-wedding-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/css/variables.css',
    '/css/base.css',
    '/css/components.css',
    '/css/screens.css',
    '/css/gallery.css',
    '/js/i18n.js',
    '/js/loader.js',
    '/js/countdown.js',
    '/js/app.js',
    '/js/components/lang-toggle.js',
    '/js/components/lightbox.js',
    '/js/components/gallery.js',
    '/js/components/pdf-generator.js',
    '/js/screens/screen0-language.js',
    '/js/screens/screen1-phone.js',
    '/js/screens/screen2-hero.js',
    '/js/screens/screen3-family.js',
    '/js/screens/screen4-message.js',
    '/js/screens/screen5-events.js',
    '/js/screens/screen6-event.js',
    '/js/firebase-config.js',
    '/manifest.json'
];

// Install — cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) => {
            return Promise.all(
                names
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch — network-first for Firebase, cache-first for assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Network-first for Firebase and external APIs
    if (
        url.hostname.includes('firebaseio.com') ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('firebasestorage.googleapis.com') ||
        url.hostname.includes('gstatic.com')
    ) {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
        return;
    }

    // Cache-first for local assets
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                // Cache new assets
                if (response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            });
        })
    );
});
