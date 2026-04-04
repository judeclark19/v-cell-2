// apps/web/src/persistence/completedGamesStore.ts

import { openVCellDb, STORES } from "./schema";
import type { PersistedGame } from "./types";

/**
 * Read all completed games from IndexedDB.
 *
 * NOTE: This is a simple MVP read path. If the list grows large,
 * switch to cursor-based paging + sorting by `endedAtMs`.
 */
export async function getAllCompletedGames(): Promise<PersistedGame[]> {
  // SSR-safe: on the server, just return empty.
  if (typeof window === "undefined") return [];

  const db = await openVCellDb();

  return new Promise<PersistedGame[]>((resolve, reject) => {
    const tx = db.transaction(STORES.COMPLETED_GAMES, "readonly");
    const store = tx.objectStore(STORES.COMPLETED_GAMES);
    const request = store.getAll();

    request.onsuccess = () => {
      // IDB returns `any[]`; we trust our own writes and cast to the domain type.
      resolve(request.result as PersistedGame[]);
    };

    request.onerror = () =>
      reject(request.error ?? new Error("Failed to read completed games"));
  });
}

/**
 * Append a completed game to IndexedDB.
 *
 * Uses `put` so retries are idempotent by `sessionId`.
 */
export async function upsertCompletedGame(game: PersistedGame): Promise<void> {
  if (typeof window === "undefined") return;

  const db = await openVCellDb();

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.COMPLETED_GAMES, "readwrite");
    const store = tx.objectStore(STORES.COMPLETED_GAMES);

    // `put` overwrites if the key already exists.
    const request = store.put(game);

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to write completed game"));
  });
}

/**
 * Replace all completed games (useful for one-time hydration or resets).
 */
export async function replaceCompletedGames(
  games: PersistedGame[]
): Promise<void> {
  if (typeof window === "undefined") return;

  const db = await openVCellDb();

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.COMPLETED_GAMES, "readwrite");
    const store = tx.objectStore(STORES.COMPLETED_GAMES);

    const clearReq = store.clear();
    clearReq.onerror = () =>
      reject(clearReq.error ?? new Error("Failed to clear completed games"));

    clearReq.onsuccess = () => {
      for (const g of games) {
        store.put(g);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error("Failed to replace completed games"));
      tx.onabort = () =>
        reject(
          tx.error ??
            new Error("Transaction aborted while replacing completed games")
        );
    };
  });
}

/**
 * Clear all completed games from IndexedDB.
 *
 * Used during first-login migration when local history should be reset.
 */
export async function clearCompletedGames(): Promise<void> {
  if (typeof window === "undefined") return;

  const db = await openVCellDb();

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.COMPLETED_GAMES, "readwrite");
    const store = tx.objectStore(STORES.COMPLETED_GAMES);

    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to clear completed games"));
  });
}
