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
import { upsertInProgressGame } from "@/persistence/inProgressGamesStore";
import { upsertCompletedGame } from "@/persistence/completedGamesStore";
import { getOrCreateDeviceId } from "../schema";
import { PersistedGame } from "../types";

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

function shouldForceServerHydrationOnce(
  uid: string,
  deviceId: string
): boolean {
  const key = `vcell:forceServerHydrationOnce:${uid}:${deviceId}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;

    // One-shot marker: remove it so the next login can hydrate normally.
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

// Narrowing helpers: we only upsert to IndexedDB when the doc has enough fields
// to satisfy the local Persisted* types.
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
  // Adjust if your completed schema is stricter. This is the minimum to avoid
  // poisoning local state with half-baked docs.
  return typeof d.seed === "string" && isRecord(d.rules);
}

/**
 * Hydrate local IndexedDB stores from the signed-in user's Firestore `games` collection.
 *
 * Routes docs by `status`:
 * - status === "in_progress" -> inProgressGames
 * - otherwise -> completedGames
 */
export function useCloudGamesHydration(uid: string | null) {
  const unsubRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    // Clean up any prior listener when uid changes.
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    if (!uid) return;

    const localDeviceId = getOrCreateDeviceId();
    const forceServerHydration = shouldForceServerHydrationOnce(
      uid,
      localDeviceId
    );
    const lastCloudSyncMs = getLastCloudSyncMs(uid, localDeviceId);

    const gamesCol = collection(db, "users", uid, "games");
    // Incremental listener: after we have a watermark, only listen for docs newer than the last sync.
    // First run (no watermark) still listens to the full collection.
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
      docId: string
    ): Promise<boolean> => {
      if (
        typeof data.updatedAtMs === "number" &&
        data.updatedAtMs <= lastCloudSyncMs
      ) {
        return false;
      }

      const sessionId = String((data.sessionId as string | undefined) ?? docId);
      const status = data.status;

      if (status === "in_progress") {
        if (!hasInProgressFields(data)) return false;

        // In-progress is per-device. Only hydrate the in-progress game that
        // belongs to THIS device; otherwise devices will overwrite each other.
        const cloudDeviceId = data.deviceId;
        if (typeof cloudDeviceId !== "string") return false;
        if (cloudDeviceId !== localDeviceId) return false;

        const payload = {
          ...(data as unknown as PersistedGame),
          sessionId,
          deviceId: cloudDeviceId,
          userId: uid
        } satisfies PersistedGame;

        await upsertInProgressGame(payload);
        return true;
      }

      // Completed
      if (!hasCompletedFields(data)) return false;

      const payload = {
        ...(data as unknown as PersistedGame),
        sessionId,
        userId: uid
      } satisfies PersistedGame;

      await upsertCompletedGame(payload, "upsertFromDocData");
      return true;
    };

    const handleSnapshot = async (snap: QuerySnapshot<DocumentData>) => {
      let maxSeen = 0;

      for (const change of snap.docChanges()) {
        const raw = change.doc.data() ?? {};
        const data: AnyRecord = isRecord(raw) ? raw : {};

        if (change.type === "removed") {
          // Conservative: ignore removals for now.
          continue;
        }

        if (
          typeof data.updatedAtMs === "number" &&
          data.updatedAtMs > maxSeen
        ) {
          maxSeen = data.updatedAtMs;
        }
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
      const snap = await getDocsFromServer(q);

      for (const docSnap of snap.docs) {
        const raw = docSnap.data() ?? {};
        const data: AnyRecord = isRecord(raw) ? raw : {};
        await upsertFromDocData(data, docSnap.id);
      }
    };

    unsubRef.current = onSnapshot(
      q,
      (snap) => {
        if (forceServerHydration && snap.metadata.fromCache) return;

        handleSnapshot(snap).catch((err) => {
          console.error("[cloud hydration] failed to apply snapshot", err);
        });
      },
      (err) => {
        console.error("[cloud hydration] listener error", err);
      }
    );

    // Always do a one-time server sync on login to ensure correctness.
    handleServerSync().catch((err) => {
      console.error("[cloud hydration] server sync failed", err);
    });

    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [uid]);
}
