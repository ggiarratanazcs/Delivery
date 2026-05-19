const CACHE_NAME = 'zcs-delivery-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Installazione: pre-cacha gli asset statici
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Attivazione: rimuove cache vecchie
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network first, fallback cache
// Le chiamate Supabase non vengono mai cachate
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Escludi Supabase e risorse esterne
  if (
    url.hostname.includes('supabase') ||
    url.hostname.includes('google') ||
    url.protocol === 'chrome-extension:'
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cacha una copia della risposta
        const clone = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});