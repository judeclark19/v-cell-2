"use client";

import { useEffect, useRef } from "react";
import {
  collection,
  getDocsFromServer,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
  type QuerySnapshot
} from "firebase/firestore";

import { db } from "@/lib/firebaseClient";
import {
  deleteInProgressGameForDevice,
  getInProgressGameForDevice,
  upsertInProgressGame
} from "@/persistence/inProgressGamesStore";
import {
  getCompletedGameBySessionId,
  upsertCompletedGame
} from "@/persistence/completedGamesStore";
import { addCompletedGame } from "@/state/records/recordsSlice";
import { AppDispatch } from "@/state/reduxStore";
import { useDispatch } from "react-redux";
import {
  markCloudSyncAvailable,
  markCloudSyncUnavailable
} from "@/state/network/cloudSyncAvailability";
import { getOrCreateDeviceId } from "../schema";
import { PersistedGame } from "../types";
import {
  doesCloudGameMatchLocalVersion,
  getPersistedGameSyncVersion,
  markPersistedGameSynced,
  withPersistedGameSyncVersion
} from "../cloudSync";
import { shouldIgnoreCloudInProgress } from "../reconciliation";

// Cloud model: users/{uid}/games/{sessionId}
// Local model: inProgressGames (single slot per device) + completedGames (history)

type AnyRecord = Record<string, unknown>;

function isRecord(v: unknown): v is AnyRecord {
  return typeof v === "object" && v !== null;
}

function getLastCloudSyncMs(uid: string, deviceId: string): number {
  const key = `vcell:lastCloudSyncMs:${uid}:${deviceId}`;
  try {
    const raw = localStorage.getItem(key);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function setLastCloudSyncMs(uid: string, deviceId: string, ms: number): void {
  if (!Number.isFinite(ms) || ms <= 0) return;
  const key = `vcell:lastCloudSyncMs:${uid}:${deviceId}`;
  try {
    localStorage.setItem(key, String(Math.floor(ms)));
  } catch {
    // ignore
  }
}

function hasInProgressFields(d: AnyRecord): boolean {
  return (
    typeof d.seed === "string" &&
    typeof d.cursor === "number" &&
    typeof d.timeElapsedMs === "number" &&
    (typeof d.startedAtMs === "number" || d.startedAtMs === null) &&
    (typeof d.endedAtMs === "number" || d.endedAtMs === null) &&
    typeof d.paused === "boolean" &&
    typeof d.moveCount === "number" &&
    typeof d.undosUsed === "number" &&
    Array.isArray(d.moves) &&
    isRecord(d.rules)
  );
}

function hasCompletedFields(d: AnyRecord): boolean {
  return typeof d.seed === "string" && isRecord(d.rules);
}

function mergeCloudGameIntoLocal(
  existing: PersistedGame | null,
  cloudGame: PersistedGame
): PersistedGame {
  const hydratedCloudGame = withPersistedGameSyncVersion(cloudGame);

  if (!existing) {
    return markPersistedGameSynced(hydratedCloudGame);
  }

  const cloudVersion = getPersistedGameSyncVersion(hydratedCloudGame);
  const existingVersion = getPersistedGameSyncVersion(existing);

  if (
    doesCloudGameMatchLocalVersion(
      withPersistedGameSyncVersion(existing),
      hydratedCloudGame,
      hydratedCloudGame.sessionId
    ) ||
    cloudVersion > existingVersion
  ) {
    return {
      ...markPersistedGameSynced(hydratedCloudGame),
      lastCloudAttemptAtMs: existing.lastCloudAttemptAtMs ?? null
    };
  }

  if (existingVersion > cloudVersion) {
    return existing;
  }

  return {
    ...hydratedCloudGame,
    syncState: existing.syncState,
    lastCloudAttemptAtMs: existing.lastCloudAttemptAtMs ?? null,
    lastCloudError: existing.lastCloudError ?? null
  };
}

export function useCloudGamesHydration(uid: string | null) {
  const dispatch = useDispatch<AppDispatch>();
  const unsubRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    if (!uid) return;

    const localDeviceId = getOrCreateDeviceId();
    const lastCloudSyncMs = getLastCloudSyncMs(uid, localDeviceId);

    const gamesCol = collection(db, "users", uid, "games");
    const fullSyncQuery = query(gamesCol, orderBy("updatedAtMs", "desc"));
    const q =
      lastCloudSyncMs > 0
        ? query(
            gamesCol,
            where("updatedAtMs", ">", lastCloudSyncMs),
            orderBy("updatedAtMs", "asc")
          )
        : query(gamesCol, orderBy("updatedAtMs", "desc"));

    const upsertFromDocData = async (
      data: AnyRecord,
      docId: string,
      respectWatermark = true
    ): Promise<boolean> => {
      if (
        respectWatermark &&
        typeof data.updatedAtMs === "number" &&
        data.updatedAtMs <= lastCloudSyncMs
      ) {
        return false;
      }

      const sessionId = String((data.sessionId as string | undefined) ?? docId);
      const status = data.status;

      if (status === "in_progress") {
        if (!hasInProgressFields(data)) return false;

        const cloudDeviceId = data.deviceId;
        if (typeof cloudDeviceId !== "string") return false;
        if (cloudDeviceId !== localDeviceId) return false;

        const localCompleted = await getCompletedGameBySessionId(sessionId);
        if (
          shouldIgnoreCloudInProgress({
            cloudSessionId: sessionId,
            localCompleted
          })
        ) {
          return false;
        }

        const existing = await getInProgressGameForDevice(localDeviceId);
        const basePayload = withPersistedGameSyncVersion({
          ...(data as unknown as PersistedGame),
          sessionId,
          deviceId: cloudDeviceId,
          userId: uid
        } satisfies PersistedGame);

        await upsertInProgressGame(mergeCloudGameIntoLocal(existing, basePayload));
        return true;
      }

      if (!hasCompletedFields(data)) return false;

      const existingCompleted = await getCompletedGameBySessionId(sessionId);
      const basePayload = withPersistedGameSyncVersion({
        ...(data as unknown as PersistedGame),
        sessionId,
        userId: uid
      } satisfies PersistedGame);

      const merged = mergeCloudGameIntoLocal(existingCompleted, basePayload);
      await upsertCompletedGame(merged);

      const inProgress = await getInProgressGameForDevice(localDeviceId);
      if (inProgress?.sessionId === sessionId) {
        await deleteInProgressGameForDevice(localDeviceId);
      }

      dispatch(addCompletedGame(merged));
      return true;
    };

    const handleSnapshot = async (snap: QuerySnapshot<DocumentData>) => {
      let maxSeen = 0;

      if (!snap.metadata.fromCache) {
        markCloudSyncAvailable();
      }

      for (const change of snap.docChanges()) {
        const raw = change.doc.data() ?? {};
        const data: AnyRecord = isRecord(raw) ? raw : {};

        if (
          typeof data.updatedAtMs === "number" &&
          data.updatedAtMs > maxSeen
        ) {
          maxSeen = data.updatedAtMs;
        }

        await upsertFromDocData(data, change.doc.id, false);
      }

      if (maxSeen > 0) {
        setLastCloudSyncMs(
          uid,
          localDeviceId,
          Math.max(lastCloudSyncMs, maxSeen)
        );
      }
    };

    const handleServerSync = async () => {
      const snap = await getDocsFromServer(fullSyncQuery);
      let maxSeen = 0;

      for (const docSnap of snap.docs) {
        const raw = docSnap.data() ?? {};
        const data: AnyRecord = isRecord(raw) ? raw : {};
        await upsertFromDocData(data, docSnap.id, false);

        if (
          typeof data.updatedAtMs === "number" &&
          data.updatedAtMs > maxSeen
        ) {
          maxSeen = data.updatedAtMs;
        }
      }

      markCloudSyncAvailable();

      if (maxSeen > 0) {
        setLastCloudSyncMs(
          uid,
          localDeviceId,
          Math.max(lastCloudSyncMs, maxSeen)
        );
      }
    };

    unsubRef.current = onSnapshot(
      q,
      (snap) => {
        handleSnapshot(snap).catch((err) => {
          markCloudSyncUnavailable(err);
          console.error("[cloud hydration] failed to apply snapshot", err);
        });
      },
      (err) => {
        markCloudSyncUnavailable(err);
        console.error("[cloud hydration] listener error", err);
      }
    );

    handleServerSync().catch((err) => {
      markCloudSyncUnavailable(err);
      console.error("[cloud hydration] server sync failed", err);
    });

    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [dispatch, uid]);
}
