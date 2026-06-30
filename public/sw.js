// Finup shell-only service worker (FR-SHELL-01/03, TC-STACK-01).
// Makes the shell installable and lets it render offline after a prior visit.
// It NEVER caches financial data or mutations — only GET navigations and static
// shell assets. Versioned cache; old caches are cleared on activate.
//
// DEV SAFETY / SELF-HEAL: on localhost the SW does NOT cache and actively tears
// itself down. In dev, /_next/static/* chunk URLs are stable (not content-hashed),
// so a cache-first SW serves a stale app bundle — the client then hydrates against
// old code that doesn't know new routes (blank page + hydration mismatch). Because
// the browser always revalidates THIS script over the network, shipping a changed
// sw.js lets an already-installed stale worker be replaced by this one, which then
// clears caches, unregisters, and reloads controlled tabs back to a clean state.

const CACHE = "finup-shell-v2";
const SHELL_ROUTES = new Set(["/", "/about", "/dashboard"]);
const PRECACHE = ["/", "/about", "/dashboard", "/manifest.webmanifest", "/icon-192.png"];

const isLocalDev = ["localhost", "127.0.0.1", "[::1]"].includes(
  self.location.hostname,
);

async function purgeAllCaches() {
  const keys = await caches.keys();
  await Promise.all(keys.map((k) => caches.delete(k)));
}

self.addEventListener("install", (event) => {
  if (isLocalDev) {
    // Don't precache anything in dev; just take over so we can self-destruct.
    event.waitUntil(self.skipWaiting());
    return;
  }
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  if (isLocalDev) {
    // Recovery path: drop every cache, stop controlling, and reload open tabs so
    // they fetch fresh, uncontrolled assets. After this the page has no SW in dev.
    event.waitUntil(
      (async () => {
        await purgeAllCaches();
        await self.registration.unregister();
        const clients = await self.clients.matchAll({ type: "window" });
        for (const client of clients) {
          client.navigate(client.url).catch(() => undefined);
        }
      })(),
    );
    return;
  }
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // In dev, never intercept — let everything hit the network untouched.
  if (isLocalDev) return;

  const { request } = event;
  // Only GET, same-origin. Never touch mutations or cross-origin/API traffic.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isNavigation =
    request.mode === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html");

  if (isNavigation) {
    // Network-first so content stays fresh; fall back to cache when offline.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (SHELL_ROUTES.has(url.pathname)) {
            const copy = response.clone();
            event.waitUntil(
              caches.open(CACHE).then((cache) => cache.put(request, copy)),
            );
          }
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match("/dashboard"))
            .then((cached) => cached || caches.match("/")),
        ),
    );
    return;
  }

  // Static shell assets: cache-first for speed; revalidate in the background.
  // Safe in production because /_next/static/* filenames are immutable content
  // hashes — a new build references new URLs that miss the cache and fetch fresh.
  if (url.pathname.startsWith("/_next/static/") || PRECACHE.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});
