
const CACHE = 'deal-dhamaka-v7-cache';

const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './dashboard.js',
  './followup.js',
  './manifest.json'
];

const APP_FILES = new Set([
  './',
  './index.html',
  './styles.css',
  './app.js',
  './dashboard.js',
  './followup.js',
  './manifest.json'
]);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  const path = url.pathname;
    const isAppFile =
  path.endsWith('/styles.css') ||
  path.endsWith('/app.js') ||
  path.endsWith('/dashboard.js') ||
  path.endsWith('/followup.js') ||
  path.endsWith('/index.html') ||
  path.endsWith('/manifest.json') ||
  path.endsWith('/');

  if (isAppFile) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();

            caches.open(CACHE).then(cache =>
              cache.put(request, copy)
            );
          }

          return response;
        })
        .catch(() =>
          caches.match(request).then(cached =>
            cached || caches.match('./index.html')
          )
        )
    );

    return;
  }

  event.respondWith(
    caches.match(request).then(cached =>
      cached ||
      fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();

          caches.open(CACHE).then(cache =>
            cache.put(request, copy)
          );
        }

        return response;
      })
    )
  );
});
