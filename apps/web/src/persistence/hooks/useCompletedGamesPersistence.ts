"use client";

import { useEffect, useRef } from "react";
import {
  getAllCompletedGames,
  upsertCompletedGame
} from "../completedGamesStore";
import { deleteInProgressGameForDevice } from "../inProgressGamesStore";
import { getOrCreateDeviceId } from "../schema";
import type { PersistedGame } from "../types";

type Params = {
  uid: string | null;
  completedGames: PersistedGame[];
  setCompletedGames: React.Dispatch<React.SetStateAction<PersistedGame[]>>;
};

export function useCompletedGamesPersistence({
  uid,
  completedGames,
  setCompletedGames
}: Params) {
  const completedGamesHydratedRef = useRef<boolean>(false);
  const persistedCompletedGameIdsRef = useRef<Set<string>>(new Set());

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
        persistedCompletedGameIdsRef.current = new Set(
          persisted.map((g) => g.gameId)
        );

        setCompletedGames(persisted);
      } catch (err) {
        completedGamesHydratedRef.current = true;
        console.error("Failed to hydrate completed games from IndexedDB", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setCompletedGames]);

  // ---------------------------------------------------------------------------
  // Append newly completed games (IndexedDB)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!completedGamesHydratedRef.current) return;

    const persistedIds = persistedCompletedGameIdsRef.current;
    const pending = completedGames.filter((g) => !persistedIds.has(g.gameId));
    if (pending.length === 0) return;

    (async () => {
      for (const g of pending) {
        try {
          console.debug(
            "[completedGamesPersistence] persisting completed game",
            {
              gameId: g.gameId,
              status: g.status,
              endedAtMs: g.endedAtMs
            }
          );
          const gameToPersist = uid ? { ...g, userId: uid } : g;
          await upsertCompletedGame(
            gameToPersist,
            "useCompletedGamesPersistence effect"
          );
          persistedIds.add(g.gameId);

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

        persistedCompletedGameIdsRef.current = new Set(
          persisted.map((g) => g.gameId)
        );

        setCompletedGames(persisted);
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
  }, [uid, setCompletedGames]);
}
