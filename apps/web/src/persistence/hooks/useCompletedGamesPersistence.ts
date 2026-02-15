"use client";

import { useEffect, useRef } from "react";
import {
  getAllCompletedGames,
  upsertCompletedGame
} from "../completedGamesStore";
import { deleteInProgressGameForDevice } from "../inProgressGamesStore";
import { getOrCreateDeviceId } from "../schema";
import type { PersistedGame } from "../types";
import { db } from "@/lib/firebaseClient";
import { doc, setDoc } from "firebase/firestore";

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
  const firestoreCompletedSyncedIdsRef = useRef<Set<string>>(new Set());

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

          if (uid) {
            // Optional: attach for debugging; path is the real ownership.
            const payload = { ...g, userId: uid };

            await setDoc(doc(db, "users", uid, "games", g.gameId), payload, {
              merge: true
            });
          }

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
    if (!uid) return;
    if (!completedGamesHydratedRef.current) return;

    const synced = firestoreCompletedSyncedIdsRef.current;

    (async () => {
      for (const g of completedGames) {
        if (synced.has(g.gameId)) continue;
        try {
          await setDoc(
            doc(db, "users", uid, "games", g.gameId),
            { ...g, userId: uid },
            { merge: true }
          );
          synced.add(g.gameId);
        } catch {
          // ignore; try later
        }
      }
    })();
  }, [uid, completedGames]);
}
