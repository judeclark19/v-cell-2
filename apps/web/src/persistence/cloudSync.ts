import { db } from "@/lib/firebaseClient";
import { doc, getDocFromServer, setDoc } from "firebase/firestore";
import {
  markCloudSyncAvailable,
  markCloudSyncUnavailable
} from "@/state/network/cloudSyncAvailability";
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

export function getPersistedGameSyncVersion(
  game: Pick<PersistedGame, "updatedAtMs" | "endedAtMs" | "syncVersion">
): number {
  if (typeof game.syncVersion === "number" && Number.isFinite(game.syncVersion)) {
    return game.syncVersion;
  }

  if (typeof game.updatedAtMs === "number" && Number.isFinite(game.updatedAtMs)) {
    return game.updatedAtMs;
  }

  if (typeof game.endedAtMs === "number" && Number.isFinite(game.endedAtMs)) {
    return game.endedAtMs;
  }

  return 0;
}

export function withPersistedGameSyncVersion<T extends PersistedGame>(game: T): T {
  const syncVersion = getPersistedGameSyncVersion(game);
  if (game.syncVersion === syncVersion) return game;

  return {
    ...game,
    syncVersion
  };
}

export function toCloudPersistedGame(game: PersistedGame): PersistedGame {
  const entries = Object.entries(withPersistedGameSyncVersion(game)).filter(
    ([key]) => !LOCAL_ONLY_FIELDS.has(key)
  );

  return Object.fromEntries(entries) as PersistedGame;
}

export function markPersistedGamePendingSync(
  game: PersistedGame,
  err?: unknown
): PersistedGame {
  return {
    ...withPersistedGameSyncVersion(game),
    syncState: "pending_upload",
    lastCloudAttemptAtMs: Date.now(),
    lastCloudError: err ? toCloudErrorMessage(err) : null
  };
}

export function markPersistedGameSynced(game: PersistedGame): PersistedGame {
  return {
    ...withPersistedGameSyncVersion(game),
    syncState: "synced",
    lastCloudAttemptAtMs: Date.now(),
    lastCloudError: null
  };
}

export function needsCloudSync(game: PersistedGame, uid: string): boolean {
  if (!uid) return false;
  if (game.userId !== uid) return false;
  return game.syncState === "pending_upload";
}

export function markPersistedGameUploaded(
  game: PersistedGame
): PersistedGame {
  return {
    ...withPersistedGameSyncVersion(game),
    syncState: "uploaded",
    lastCloudAttemptAtMs: Date.now(),
    lastCloudError: null
  };
}

export function doesCloudGameMatchLocalVersion(
  localGame: PersistedGame,
  cloudGame: Partial<PersistedGame>,
  cloudSessionId: string
): boolean {
  if (cloudSessionId !== localGame.sessionId) return false;

  const localVersion = getPersistedGameSyncVersion(localGame);
  const cloudVersion = getPersistedGameSyncVersion(
    cloudGame as Pick<PersistedGame, "updatedAtMs" | "endedAtMs" | "syncVersion">
  );

  if (localVersion <= 0 || cloudVersion <= 0) return false;
  if (localVersion !== cloudVersion) return false;

  if (isCompletedStatus(localGame.status)) {
    return cloudGame.status === localGame.status;
  }

  return cloudGame.status === "in_progress";
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

  return doesCloudGameMatchLocalVersion(game, data, serverSessionId);
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
    const syncReadyGame = withPersistedGameSyncVersion(game);
    await writeGameToCloud(uid, syncReadyGame);
    markCloudSyncAvailable();

    const attempted = markPersistedGameUploaded(syncReadyGame);
    await upsertLocal(attempted);

    const confirmed = await confirmGameSyncedFromServer(uid, attempted);
    if (!confirmed) {
      return false;
    }

    markCloudSyncAvailable();
    await upsertLocal(markPersistedGameSynced(attempted));
    return true;
  } catch (err) {
    markCloudSyncUnavailable(err);
    await upsertLocal(markPersistedGamePendingSync(game, err));
    throw err;
  }
}
