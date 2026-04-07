const CACHE_VERSION = "vcell-shell-v2";
const DOCUMENT_CACHE = `${CACHE_VERSION}-documents`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;

const OFFLINE_DOCUMENTS = ["/", "/game", "/settings", "/how-to-play", "/stats"];
const OFFLINE_ASSETS = [
  "/favicon.ico",
  "/images/V.png",
  "/images/vcell-logo.webp",
  "/images/wood.webp",
  "/images/spades.svg",
  "/images/hearts.svg",
  "/images/clubs.svg",
  "/images/diamonds.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const documentCache = await caches.open(DOCUMENT_CACHE);
      await documentCache.addAll(OFFLINE_DOCUMENTS);

      const assetCache = await caches.open(ASSET_CACHE);
      await assetCache.addAll(OFFLINE_ASSETS);

      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => ![DOCUMENT_CACHE, ASSET_CACHE].includes(key))
          .map((key) => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

function normalizePathname(url) {
  const pathname = url.pathname.replace(/\/+$/, "");
  return pathname === "" ? "/" : pathname;
}

function isOfflineDocument(pathname) {
  return OFFLINE_DOCUMENTS.includes(pathname);
}

function isStaticAssetRequest(request, url) {
  if (url.origin !== self.location.origin) return false;

  return (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "font" ||
    request.destination === "image"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const pathname = normalizePathname(url);

        try {
          const response = await fetch(request);
          if (response && response.ok && isOfflineDocument(pathname)) {
            const cache = await caches.open(DOCUMENT_CACHE);
            cache.put(request, response.clone());
          }
          return response;
        } catch (error) {
          const cache = await caches.open(DOCUMENT_CACHE);
          const cachedResponse =
            (await cache.match(request)) ||
            (pathname !== "/" ? await cache.match(pathname) : null) ||
            (await cache.match("/game"));

          if (cachedResponse) {
            return cachedResponse;
          }

          throw error;
        }
      })()
    );
    return;
  }

  if (isStaticAssetRequest(request, url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSET_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;

        const response = await fetch(request);
        if (response && response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      })()
    );
  }
});
