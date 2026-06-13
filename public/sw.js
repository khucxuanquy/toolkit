/* OfflineKit / Quy's Toolkit service worker — hand-written (Next 16 + Turbopack
 * static export). For true offline support the ENTIRE build output is precached
 * at install time. `scripts/build-sw.mjs` runs after `next build` and injects
 * the file list + a content hash below (the placeholders are replaced in the
 * deployed `out/sw.js`; in dev they stay inert and the SW isn't registered).
 */
const CACHE_VERSION = "quy-toolkit-__BUILD_ID__";

// Replaced at build with every file in out/ (HTML, _next chunks, RSC .txt,
// icons, manifest…). Empty in dev.
const PRECACHE_ASSETS = [];

// Minimal fallback list so the SW still does something if the build step is skipped.
const CORE_URLS = ["/", "/offline", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  const urls = [...new Set([...CORE_URLS, ...PRECACHE_ASSETS])];
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // Tolerate individual failures so install never rejects.
      Promise.allSettled(urls.map((url) => cache.add(url))),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // App navigations: network-first (fresh when online), fall back to the cached
  // page, then the cached /offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE_VERSION);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(CACHE_VERSION);
          return (
            (await cache.match(request)) ||
            (await cache.match(url.pathname)) ||
            (await cache.match("/offline")) ||
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  // Everything else same-origin (JS/CSS chunks, lazy plugin code, RSC .txt,
  // icons, fonts…): cache-first, then network (and cache it). This is what makes
  // already-precached plugin pages work fully offline.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const fresh = await fetch(request);
        if (fresh && fresh.status === 200) cache.put(request, fresh.clone());
        return fresh;
      } catch {
        return cached || Response.error();
      }
    })(),
  );
});
