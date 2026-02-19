import { getOrCreateDeviceId, openVCellDb, STORES } from "./schema";
import type { PersistedGame } from "./types";

export type InProgressGame = PersistedGame;

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

export async function getInProgressGameForDevice(
  deviceId: string
): Promise<InProgressGame | null> {
  if (typeof window === "undefined") return null;
  const db = await openVCellDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.IN_PROGRESS_GAMES, "readonly");
    const store = tx.objectStore(STORES.IN_PROGRESS_GAMES);
    const req = store.get(deviceId);

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

export async function deleteInProgressGameForDevice(
  deviceId: string
): Promise<void> {
  if (typeof window === "undefined") return;
  const db = await openVCellDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.IN_PROGRESS_GAMES, "readwrite");
    const store = tx.objectStore(STORES.IN_PROGRESS_GAMES);
    const req = store.delete(deviceId);

    req.onsuccess = () => resolve();
    req.onerror = () =>
      reject(req.error ?? new Error("Failed to delete in-progress game"));
  });
}

export async function getInProgressGameForThisDevice(): Promise<InProgressGame | null> {
  const deviceId = getOrCreateDeviceId();
  return getInProgressGameForDevice(deviceId);
}
