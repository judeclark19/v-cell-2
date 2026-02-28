"use client";

import { useEffect, useRef } from "react";
import type { PersistedGame } from "@/persistence/types";
import { db } from "@/lib/firebaseClient";
import {
  collection,
  getDocs,
  getDocsFromServer,
  limit,
  orderBy,
  query,
  where,
  doc,
  setDoc
} from "firebase/firestore";
import {
  getInProgressGameForDevice,
  upsertInProgressGame
} from "@/persistence/inProgressGamesStore";
import { getOrCreateDeviceId } from "@/persistence/schema";

type Params = {
  uid: string | null;
  startSession: (args: {
    kind: "seed+id";
    seed: string;
    gameId: string;
  }) => void;
  sessionReady: boolean;
};

export function useLoginReconcileInProgressGame({
  uid,
  startSession,
  sessionReady
}: Params) {
  const didReconcileOnLoginRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sessionReady) return;
    if (!uid) {
      didReconcileOnLoginRef.current = null;
      return;
    }

    // Only run once per uid per page load.
    if (didReconcileOnLoginRef.current === uid) return;
    didReconcileOnLoginRef.current = uid;

    let cancelled = false;

    (async () => {
      const deviceId = getOrCreateDeviceId();

      // 1) Check cloud for an in-progress game for THIS device.
      const gamesCol = collection(db, "users", uid, "games");
      const q = query(
        gamesCol,
        where("status", "==", "in_progress"),
        where("deviceId", "==", deviceId),
        orderBy("updatedAtMs", "desc"),
        limit(1)
      );

      let snap;
      try {
        // IMPORTANT: avoid Firestore's local cache here; we want server truth for login reconciliation.
        snap = await getDocsFromServer(q);
      } catch (err) {
        // If offline / blocked, fall back to the default behavior.
        console.warn(
          "[login reconcile] getDocsFromServer failed; falling back to getDocs",
          err
        );
        snap = await getDocs(q);
      }
      if (cancelled) return;

      const cloudDocInProgressGame = snap.docs[0];

      if (cloudDocInProgressGame) {
        // Cloud wins: hydrate local, then switch the running session to it.
        const raw = cloudDocInProgressGame.data() as PersistedGame;
        const cloudGameId =
          (raw.gameId as string | undefined) ?? cloudDocInProgressGame.id;

        const payload: PersistedGame = {
          ...(raw as PersistedGame),
          gameId: cloudGameId,
          deviceId,
          userId: uid
        };

        // Put it in IndexedDB so the normal hydration path can rebuild history/moves.
        await upsertInProgressGame(payload);

        if (cancelled) return;

        // Force the active session to match the cloud record.
        startSession({
          kind: "seed+id",
          seed: payload.seed,
          gameId: payload.gameId
        });

        return;
      }

      // 2) No cloud in-progress for this device:
      // Attribute the current local in-progress game to the user and push once.
      const local = await getInProgressGameForDevice(deviceId);

      if (cancelled) return;
      if (!local) return;

      // Only push if it’s actually an active in-progress game.
      if (local.status !== "in_progress") return;
      if (!local.hasStarted) return;

      const payload: PersistedGame = {
        ...local,
        deviceId,
        userId: uid
      };

      await upsertInProgressGame(payload);
      if (cancelled) return;

      // Push ONCE on login (your per-second persistence does not write to Firestore).
      await setDoc(doc(db, "users", uid, "games", payload.gameId), payload, {
        merge: true
      });
    })().catch((err) => {
      console.error("[login reconcile] failed", err);
    });

    return () => {
      cancelled = true;
    };
  }, [uid, sessionReady, startSession]);
}
