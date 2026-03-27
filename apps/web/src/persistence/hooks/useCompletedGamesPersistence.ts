"use client";

import { useEffect, useRef } from "react";
import {
  getAllCompletedGames,
  upsertCompletedGame
} from "../completedGamesStore";
import { deleteInProgressGameForDevice } from "../inProgressGamesStore";
import { getOrCreateDeviceId } from "../schema";
import { useDispatch, useSelector } from "react-redux";
import {
  selectCompletedGames,
  setCompletedGames
} from "@/state/records/recordsSlice";
import { selectUid } from "@/state/auth/authSlice";

export function useCompletedGamesPersistence() {
  const dispatch = useDispatch();
  // auth slice
  const uid = useSelector(selectUid);
  // records slice
  const completedGames = useSelector(selectCompletedGames);

  const completedGamesHydratedRef = useRef<boolean>(false);
  const persistedCompletedSessionIdsRef = useRef<Set<string>>(new Set());

  // ---------------------------------------------------------------------------
  // Hydrate completed games (IndexedDB)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const persisted = await getAllCompletedGames();
        if (cancelled) return;

        completedGamesHydratedRef.current = true;
        persistedCompletedSessionIdsRef.current = new Set(
          persisted.map((g) => g.sessionId)
        );

        dispatch(setCompletedGames(persisted));
      } catch (err) {
        completedGamesHydratedRef.current = true;
        console.error("Failed to hydrate completed games from IndexedDB", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  // ---------------------------------------------------------------------------
  // Append newly completed games (IndexedDB)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!completedGamesHydratedRef.current) return;

    const persistedIds = persistedCompletedSessionIdsRef.current;
    const pending = completedGames.filter(
      (g) => !persistedIds.has(g.sessionId)
    );
    if (pending.length === 0) return;

    (async () => {
      for (const g of pending) {
        try {
          console.debug(
            "[completedGamesPersistence] persisting completed game",
            {
              sessionId: g.sessionId,
              status: g.status,
              endedAtMs: g.endedAtMs
            }
          );
          const gameToPersist = uid ? { ...g, userId: uid } : g;
          await upsertCompletedGame(gameToPersist);
          persistedIds.add(g.sessionId);

          const deviceId = getOrCreateDeviceId();

          // Once a game is persisted as completed, it should no longer be “in progress”.
          await deleteInProgressGameForDevice(deviceId).catch(() => {});
        } catch {
          // Ignore write failures; game still exists in-memory.
        }
      }
    })();
  }, [uid, completedGames]);

  // ---------------------------------------------------------------------------
  // Sync new completed games to Firestore
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!completedGamesHydratedRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        const persisted = await getAllCompletedGames();
        if (cancelled) return;

        persistedCompletedSessionIdsRef.current = new Set(
          persisted.map((g) => g.sessionId)
        );

        dispatch(setCompletedGames(persisted));
      } catch (err) {
        console.error(
          "Failed to re-hydrate completed games from IndexedDB after session change",
          err
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid, dispatch]);
}
