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
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/state/reduxStore";
import {
  selectSessionId,
  selectSessionPhase
} from "@/state/session/sessionSlice";
import { transitionGameAndSession } from "@/state/transitionGameAndSession";
import { hydrateFromPersisted, selectSeed } from "../gameSlice";
import { useSession } from "@/auth/AuthProvider";

export function useLoginReconcileInProgressGame() {
  const didReconcileOnLoginRef = useRef<string | null>(null);
  const lastSwitchedSessionRef = useRef<string | null>(null);
  const dispatch = useDispatch<AppDispatch>();

  const { uid } = useSession();
  // sessioon state
  const sessionPhase = useSelector(selectSessionPhase);
  const currentSessionId = useSelector(selectSessionId);

  // game state
  const currentSeed = useSelector(selectSeed);

  useEffect(() => {
    if (sessionPhase !== "ready") return;
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
        const cloudSessionId =
          (raw.sessionId as string | undefined) ?? cloudDocInProgressGame.id;

        const payload: PersistedGame = {
          ...(raw as PersistedGame),
          sessionId: cloudSessionId,
          deviceId,
          userId: uid
        };

        // Put it in IndexedDB so the normal hydration path can rebuild history/moves.
        await upsertInProgressGame(payload);

        if (cancelled) return;

        const sessionKey = `${payload.seed}:${payload.sessionId}`;

        console.debug("current", currentSeed, currentSessionId);
        console.debug("cloud", payload.seed, payload.sessionId);

        if (
          payload.seed === currentSeed &&
          payload.sessionId === currentSessionId
        ) {
          // [login reconcile]noop; already on winning session

          return;
        }

        //  [login reconcile] cloud wins; switching session
        if (lastSwitchedSessionRef.current !== sessionKey) {
          lastSwitchedSessionRef.current = sessionKey;
          await dispatch(
            transitionGameAndSession({
              seed: payload.seed,
              sessionId: payload.sessionId,
              rules: payload.rules
            })
          ).unwrap();

          dispatch(
            hydrateFromPersisted({
              seed: payload.seed,
              rules: payload.rules,
              moves: payload.moves,
              undosUsed: payload.undosUsed,
              cursor: payload.cursor,
              fallbackRules: payload.rules,
              undoLimit: payload.rules.undoLimit,
              status: payload.status ?? null
            })
          );
        }

        return;
      }

      // 2) No cloud in-progress for this device:
      // Attribute the current local in-progress game to the user and push once.
      const local = await getInProgressGameForDevice(deviceId);

      if (cancelled) return;
      if (!local) return;

      // Only push if it’s actually an active in-progress game.
      if (local.status !== "in_progress") return;
      if (!local.startedAtMs) return;

      const payload: PersistedGame = {
        ...local,
        deviceId,
        userId: uid
      };

      await upsertInProgressGame(payload);
      if (cancelled) return;

      // Push ONCE on login (your per-second persistence does not write to Firestore).
      await setDoc(doc(db, "users", uid, "games", payload.sessionId), payload, {
        merge: true
      });
    })().catch((err) => {
      console.error("[login reconcile] failed", err);
    });

    return () => {
      cancelled = true;
    };
  }, [uid, currentSeed, currentSessionId, dispatch, sessionPhase]);
}
