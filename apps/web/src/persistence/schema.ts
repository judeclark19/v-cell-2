/**
 * Minimal IndexedDB schema + opener for V-Cell web persistence.
 *
 * Keep this layer browser-only (no React imports). The engine remains pure.
 */

export const VCELL_DB_NAME = "vcell";
export const VCELL_DB_VERSION = 65;

export const STORES = {
  COMPLETED_GAMES: "completedGames",
  IN_PROGRESS_GAMES: "inProgressGames"
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

const DEVICE_ID_KEY = "vcell.deviceId";

function safeRandomId(): string {
  // Prefer the native UUID if available
  const c = globalThis.crypto as Crypto | undefined;
  const maybeUUID = c?.randomUUID;
  if (typeof maybeUUID === "function") return maybeUUID.call(c);

  // Fallback: 16 random bytes -> hex (not a UUID, but plenty unique for IDs/seeds)
  if (c?.getRandomValues) {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Last-ditch fallback (worst uniqueness, but avoids crashing)
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const next = safeRandomId();
  window.localStorage.setItem(DEVICE_ID_KEY, next);
  return next;
}

/**
 * Open the IndexedDB database (creating/upgrading stores as needed).
 */
export function openVCellDb(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.reject(
      new Error("IndexedDB is not available in this environment.")
    );
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(VCELL_DB_NAME, VCELL_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORES.IN_PROGRESS_GAMES)) {
        db.createObjectStore(STORES.IN_PROGRESS_GAMES, { keyPath: "deviceId" });
      }

      // completedGames: durable history for stats.
      if (!db.objectStoreNames.contains(STORES.COMPLETED_GAMES)) {
        const store = db.createObjectStore(STORES.COMPLETED_GAMES, {
          keyPath: "sessionId"
        });

        // Indexes are optional today but cheap to add early.
        store.createIndex("endedAtMs", "endedAtMs", { unique: false });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("seed", "seed", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open IndexedDB"));
    request.onblocked = () =>
      reject(
        new Error(
          "IndexedDB open blocked (another tab may be holding an old version)."
        )
      );
  });
}
