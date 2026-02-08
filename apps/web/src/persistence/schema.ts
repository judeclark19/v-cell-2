/**
 * Minimal IndexedDB schema + opener for V-Cell web persistence.
 *
 * Keep this layer browser-only (no React imports). The engine remains pure.
 */

export const VCELL_DB_NAME = "vcell";
export const VCELL_DB_VERSION = 61;

export const STORES = {
  COMPLETED_GAMES: "completedGames",
  IN_PROGRESS_GAMES: "inProgressGames"
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

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
        db.createObjectStore(STORES.IN_PROGRESS_GAMES, { keyPath: "gameId" });
      }

      // completedGames: durable history for stats.
      if (!db.objectStoreNames.contains(STORES.COMPLETED_GAMES)) {
        const store = db.createObjectStore(STORES.COMPLETED_GAMES, {
          keyPath: "gameId"
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
