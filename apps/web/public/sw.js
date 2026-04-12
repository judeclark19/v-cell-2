const CACHE_VERSION = "vcell-shell-v4";
const DOCUMENT_CACHE = `${CACHE_VERSION}-documents`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const GAME_SHELL_PATH = "/game";

const OFFLINE_DOCUMENTS = ["/", "/game", "/settings", "/how-to-play", "/stats"];
const OFFLINE_ASSETS = [
  "/manifest.webmanifest",
  "/favicon.ico",
  "/images/favicon-16x16.png",
  "/images/favicon-32x32.png",
  "/images/apple-touch-icon.png",
  "/images/icon-192.png",
  "/images/icon-512.png",
  "/images/icon-maskable-192.png",
  "/images/icon-maskable-512.png",
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
      await documentCache.addAll(
        OFFLINE_DOCUMENTS.map((path) => new Request(path, { cache: "reload" }))
      );

      const assetCache = await caches.open(ASSET_CACHE);
      await assetCache.addAll(
        OFFLINE_ASSETS.map((path) => new Request(path, { cache: "reload" }))
      );

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
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/favicon.ico" ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "font" ||
    request.destination === "image"
  );
}

async function cacheDocument(pathname, response) {
  if (!response || !response.ok) return;

  const cache = await caches.open(DOCUMENT_CACHE);
  await cache.put(pathname, response.clone());
}

async function cacheAsset(request, response) {
  if (!response || !response.ok) return;

  const cache = await caches.open(ASSET_CACHE);
  await cache.put(request, response.clone());
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

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
          event.waitUntil(cacheDocument(pathname, response.clone()));
          return response;
        } catch (error) {
          const cache = await caches.open(DOCUMENT_CACHE);
          const cachedResponse =
            (await cache.match(pathname)) ||
            (isOfflineDocument(pathname) ? await cache.match(request) : null) ||
            (await cache.match(GAME_SHELL_PATH));

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
        const fetchAndCache = async () => {
          const response = await fetch(request);
          event.waitUntil(cacheAsset(request, response.clone()));
          return response;
        };

        if (cached) {
          event.waitUntil(fetchAndCache().catch(() => undefined));
          return cached;
        }

        return fetchAndCache();
      })()
    );
  }
});
