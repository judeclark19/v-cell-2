"use client";

import { useEffect, useRef } from "react";
import {
  collection,
  getDocsFromServer,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type QuerySnapshot
} from "firebase/firestore";

import { db } from "@/lib/firebaseClient";
import { upsertInProgressGame } from "@/persistence/inProgressGamesStore";
import { upsertCompletedGame } from "@/persistence/completedGamesStore";
import { getOrCreateDeviceId } from "../schema";
import { PersistedGame } from "../types";

// Cloud model: users/{uid}/games/{gameId}
// Local model: inProgressGames (single slot per device) + completedGames (history)

type AnyRecord = Record<string, unknown>;

function isRecord(v: unknown): v is AnyRecord {
  return typeof v === "object" && v !== null;
}

function isInProgress(status: unknown): boolean {
  return status === "in_progress";
}

function shouldSkipInitialCloudPull(uid: string, deviceId: string): boolean {
  const key = `vcell:skipCloudPull:${uid}:${deviceId}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;

    // One-shot marker: remove it so a reload will hydrate normally.
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
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
    typeof d.hasStarted === "boolean" &&
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

    if (shouldSkipInitialCloudPull(uid, localDeviceId)) return;

    const gamesCol = collection(db, "users", uid, "games");
    const q = query(gamesCol, orderBy("updatedAtMs", "desc"));

    const upsertFromDocData = async (data: AnyRecord, docId: string) => {
      const gameId = String((data.gameId as string | undefined) ?? docId);
      const status = data.status;

      if (isInProgress(status)) {
        if (!hasInProgressFields(data)) return;

        // In-progress is per-device. Only hydrate the in-progress game that
        // belongs to THIS device; otherwise devices will overwrite each other.
        const cloudDeviceId = data.deviceId;
        if (typeof cloudDeviceId !== "string") return;
        if (cloudDeviceId !== localDeviceId) return;

        const payload = {
          ...(data as unknown as PersistedGame),
          gameId,
          deviceId: cloudDeviceId,
          userId: uid
        } satisfies PersistedGame;

        await upsertInProgressGame(payload);
        return;
      }

      // Completed
      if (!hasCompletedFields(data)) return;

      const payload = {
        ...(data as unknown as PersistedGame),
        gameId,
        userId: uid
      } satisfies PersistedGame;

      await upsertCompletedGame(payload, "cloud hydration");
    };

    const handleSnapshot = async (snap: QuerySnapshot<DocumentData>) => {
      for (const change of snap.docChanges()) {
        const raw = change.doc.data() ?? {};
        const data: AnyRecord = isRecord(raw) ? raw : {};

        if (change.type === "removed") {
          // Conservative: ignore removals for now.
          continue;
        }

        await upsertFromDocData(data, change.doc.id);
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
