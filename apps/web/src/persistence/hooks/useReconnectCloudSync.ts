"use client";

import { useEffect, useRef } from "react";
import { useIsOffline } from "@/state/network/useIsOffline";
import { getOrCreateDeviceId } from "../schema";
import {
  deleteInProgressGameForDevice,
  getInProgressGameForDevice,
  upsertInProgressGame
} from "../inProgressGamesStore";
import {
  getAllCompletedGames,
  upsertCompletedGame
} from "../completedGamesStore";
import {
  needsCloudSync,
  syncGameToCloud
} from "../cloudSync";
import { shouldIgnoreCloudInProgress } from "../reconciliation";

export function useReconnectCloudSync(
  uid: string | null,
  authReady: boolean
) {
  const isOffline = useIsOffline();
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!authReady || !uid || isOffline) return;
    if (inFlightRef.current) return;

    let cancelled = false;
    inFlightRef.current = true;

    (async () => {
      try {
        const deviceId = getOrCreateDeviceId();
        const completedGames = await getAllCompletedGames();
        if (cancelled) return;
        const completedBySessionId = new Map(
          completedGames.map((game) => [game.sessionId, game])
        );

        for (const game of completedGames) {
          if (!needsCloudSync(game, uid)) continue;

          await syncGameToCloud({
            uid,
            game,
            upsertLocal: upsertCompletedGame
          }).catch((err) => {
            console.error("[cloud sync] failed to flush completed game", err);
          });
        }

        const inProgress = await getInProgressGameForDevice(deviceId);
        if (cancelled || !inProgress || inProgress.status !== "in_progress") {
          return;
        }

        const localCompleted =
          completedBySessionId.get(inProgress.sessionId) ?? null;

        if (
          shouldIgnoreCloudInProgress({
            cloudSessionId: inProgress.sessionId,
            localCompleted
          })
        ) {
          await deleteInProgressGameForDevice(deviceId).catch((err) => {
            console.error(
              "[cloud sync] failed to delete stale in-progress game",
              err
            );
          });
          return;
        }

        if (!needsCloudSync(inProgress, uid)) return;

        await syncGameToCloud({
          uid,
          game: inProgress,
          upsertLocal: upsertInProgressGame
        }).catch((err) => {
          console.error("[cloud sync] failed to flush in-progress game", err);
        });
      } finally {
        inFlightRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, uid, isOffline]);
}
