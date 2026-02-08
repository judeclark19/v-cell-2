import type { HistoryState } from "../state/game/GameProvider";
import { openVCellDb, STORES } from "./schema";
import type { GameState } from "@vcell/engine";

export type InProgressGame = {
  gameId: string;
  seed: string;
  rules: GameState["rules"];
  kind?: "freeplay" | "daily" | string;

  // Full snapshot
  history: HistoryState;

  // Minimal meta needed to resume UI accurately
  timeElapsedMs: number;
  hasStarted: boolean;
  startedAtMs: number | null;
  endedAtMs: number | null;
  isAbandoned: boolean;
  paused: boolean;

  // Analytics / UX
  moveCount: number;
  undosUsed: number;

  // For “continue most recent”
  updatedAtMs: number;

  // Optional: keep last completed pointer
  lastCompletedGameId?: string;
};

export async function getAllInProgressGames(): Promise<InProgressGame[]> {
  if (typeof window === "undefined") return [];
  const db = await openVCellDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.IN_PROGRESS_GAMES, "readonly");
    const store = tx.objectStore(STORES.IN_PROGRESS_GAMES);
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result as InProgressGame[]);
    req.onerror = () =>
      reject(req.error ?? new Error("Failed to read in-progress games"));
  });
}

export async function getInProgressGame(
  gameId: string
): Promise<InProgressGame | null> {
  if (typeof window === "undefined") return null;
  const db = await openVCellDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.IN_PROGRESS_GAMES, "readonly");
    const store = tx.objectStore(STORES.IN_PROGRESS_GAMES);
    const req = store.get(gameId);

    req.onsuccess = () => resolve((req.result as InProgressGame) ?? null);
    req.onerror = () =>
      reject(req.error ?? new Error("Failed to read in-progress game"));
  });
}

export async function upsertInProgressGame(
  game: InProgressGame
): Promise<void> {
  if (typeof window === "undefined") return;
  const db = await openVCellDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.IN_PROGRESS_GAMES, "readwrite");
    const store = tx.objectStore(STORES.IN_PROGRESS_GAMES);
    const req = store.put(game);

    req.onsuccess = () => resolve();
    req.onerror = () =>
      reject(req.error ?? new Error("Failed to write in-progress game"));
  });
}

export async function deleteInProgressGame(gameId: string): Promise<void> {
  if (typeof window === "undefined") return;
  const db = await openVCellDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.IN_PROGRESS_GAMES, "readwrite");
    const store = tx.objectStore(STORES.IN_PROGRESS_GAMES);
    const req = store.delete(gameId);

    req.onsuccess = () => resolve();
    req.onerror = () =>
      reject(req.error ?? new Error("Failed to delete in-progress game"));
  });
}

export async function getMostRecentInProgressGame(): Promise<InProgressGame | null> {
  const all = await getAllInProgressGames();
  if (all.length === 0) return null;

  // Pick most recently updated
  let best = all[0]!;
  for (let i = 1; i < all.length; i++) {
    const cur = all[i]!;
    if (cur.updatedAtMs > best.updatedAtMs) best = cur;
  }
  return best;
}
