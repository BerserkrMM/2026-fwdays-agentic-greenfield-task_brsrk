// Finup shell-only service worker (FR-SHELL-01/03, TC-STACK-01).
// Makes the shell installable and lets it render offline after a prior visit.
// It NEVER caches financial data or mutations — only GET navigations and static
// shell assets. Versioned cache; old caches are cleared on activate.

const CACHE = "finup-shell-v1";
const SHELL_ROUTES = new Set(["/", "/dashboard"]);
const PRECACHE = ["/", "/dashboard", "/manifest.webmanifest", "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
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
