// Service worker minimal buat syarat PWA installable.
// Strategi: network-first buat file sendiri (index.html dll) — selalu coba
// ambil versi terbaru dulu, baru fallback ke cache kalau offline. Sengaja
// BUKAN cache-first, biar update kode nggak ketahan cache kayak yang
// kemarin bikin pusing.
// Request ke luar (Apps Script, Gemini API) dibiarin lewat langsung,
// nggak disentuh sama sekali — datanya harus selalu fresh.

const CACHE_NAME = 'cost-tracker-v1';

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    fetch(e.request).then(function (res) {
      const clone = res.clone();
      caches.open(CACHE_NAME).then(function (cache) { cache.put(e.request, clone); });
      return res;
    }).catch(function () {
      return caches.match(e.request);
    })
  );
});
