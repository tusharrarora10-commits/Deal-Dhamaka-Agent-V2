/* Deal Dhamaka Agent V2 — conservative offline cache.
   Keep the existing localStorage key/data untouched.
   Do not delete unrelated caches on this origin during activation. */
const CACHE = 'deal-dhamaka-v10-cache';

const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './whatsapp-enhancements.js',
  './dashboard.js',
  './analytics.js',
  './followup.js',
  './undo-redo.js',
  './product-status.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  // Intentionally do not delete other caches: this avoids disrupting another
  // app/deployment sharing the same origin.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then(cached =>
        cached || caches.match('./index.html')
      ))
  );
});
