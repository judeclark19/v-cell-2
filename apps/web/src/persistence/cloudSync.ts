import { db } from "@/lib/firebaseClient";
import { doc, getDocFromServer, setDoc } from "firebase/firestore";
import type { PersistedGame } from "./types";
import { isCompletedStatus } from "./reconciliation";

const LOCAL_ONLY_FIELDS = new Set([
  "syncState",
  "lastCloudAttemptAtMs",
  "lastCloudError"
]);

function toCloudErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Cloud sync failed";
}

export function toCloudPersistedGame(game: PersistedGame): PersistedGame {
  const entries = Object.entries(game).filter(
    ([key]) => !LOCAL_ONLY_FIELDS.has(key)
  );

  return Object.fromEntries(entries) as PersistedGame;
}

export function markPersistedGamePendingSync(
  game: PersistedGame,
  err?: unknown
): PersistedGame {
  return {
    ...game,
    syncState: "pending",
    lastCloudAttemptAtMs: Date.now(),
    lastCloudError: err ? toCloudErrorMessage(err) : null
  };
}

export function markPersistedGameSynced(game: PersistedGame): PersistedGame {
  return {
    ...game,
    syncState: "synced",
    lastCloudAttemptAtMs: Date.now(),
    lastCloudError: null
  };
}

export function needsCloudSync(game: PersistedGame, uid: string): boolean {
  if (!uid) return false;
  if (game.userId !== uid) return false;
  return game.syncState !== "synced";
}

export function markPersistedGameCloudAttempted(
  game: PersistedGame
): PersistedGame {
  return {
    ...game,
    syncState: "pending",
    lastCloudAttemptAtMs: Date.now()
  };
}

export async function confirmGameSyncedFromServer(
  uid: string | null,
  game: PersistedGame
): Promise<boolean> {
  if (!uid) return false;

  const snap = await getDocFromServer(doc(db, "users", uid, "games", game.sessionId));
  if (!snap.exists()) return false;

  const data = snap.data() as Partial<PersistedGame>;
  const serverSessionId =
    typeof data.sessionId === "string" ? data.sessionId : snap.id;

  if (serverSessionId !== game.sessionId) return false;

  if (isCompletedStatus(game.status)) {
    return isCompletedStatus(data.status as PersistedGame["status"]);
  }

  return data.status === "in_progress";
}

export async function writeGameToCloud(
  uid: string | null,
  game: PersistedGame
): Promise<void> {
  if (!uid) return;

  await setDoc(
    doc(db, "users", uid, "games", game.sessionId),
    toCloudPersistedGame(game),
    { merge: true }
  );
}

export async function syncGameToCloud({
  uid,
  game,
  upsertLocal
}: {
  uid: string | null;
  game: PersistedGame;
  upsertLocal: (game: PersistedGame) => Promise<void>;
}): Promise<boolean> {
  try {
    await writeGameToCloud(uid, game);

    const attempted = markPersistedGameCloudAttempted(game);
    await upsertLocal(attempted);

    const confirmed = await confirmGameSyncedFromServer(uid, attempted);
    if (!confirmed) {
      return false;
    }

    await upsertLocal(markPersistedGameSynced(attempted));
    return true;
  } catch (err) {
    await upsertLocal(markPersistedGamePendingSync(game, err));
    throw err;
  }
}
