"use client";

import { useEffect, useRef } from "react";
import type { GameResult } from "../../state/game/GameProvider";
import {
  getAllCompletedGames,
  upsertCompletedGame
} from "../completedGamesStore";
import { deleteInProgressGame } from "../inProgressGamesStore";

type Params = {
  completedGames: GameResult[];
  setCompletedGames: React.Dispatch<React.SetStateAction<GameResult[]>>;
};

export function useCompletedGamesPersistence({
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
          await upsertCompletedGame(g);
          persistedIds.add(g.gameId);

          // Once a game is persisted as completed, it should no longer be “in progress”.
          await deleteInProgressGame(g.gameId).catch(() => {});
        } catch {
          // Ignore write failures; game still exists in-memory.
        }
      }
    })();
  }, [completedGames]);
}
