"use client";

import { useEffect, useRef, useState } from "react";
import {
  useBrowserOffline,
  useCloudSyncAvailability
} from "@/state/network/useIsOffline";
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
import { getNewestCloudInProgressForDevice } from "../cloudInProgress";

export function useReconnectCloudSync(
  uid: string | null,
  authReady: boolean
) {
  const browserOffline = useBrowserOffline();
  const { cloudUnavailable } = useCloudSyncAvailability();
  const inFlightRef = useRef(false);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (!authReady || !uid) return;

    const bumpRetryTick = () => {
      setRetryTick((value) => value + 1);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        bumpRetryTick();
      }
    };

    window.addEventListener("online", bumpRetryTick);
    window.addEventListener("focus", bumpRetryTick);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    let retryTimer: number | null = null;
    if (cloudUnavailable && !browserOffline) {
      retryTimer = window.setTimeout(bumpRetryTick, 5000);
    }

    return () => {
      window.removeEventListener("online", bumpRetryTick);
      window.removeEventListener("focus", bumpRetryTick);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (retryTimer != null) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [authReady, uid, cloudUnavailable, browserOffline]);

  useEffect(() => {
    if (!authReady || !uid || browserOffline) return;
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

        const cloudInProgress = await getNewestCloudInProgressForDevice({
          uid,
          deviceId,
          pruneStale: true,
          source: "server"
        }).catch((err) => {
          console.warn(
            "[cloud sync] failed to check existing cloud in-progress game",
            err
          );
          return null;
        });

        if (
          cloudInProgress &&
          cloudInProgress.sessionId !== inProgress.sessionId
        ) {
          return;
        }

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
  }, [authReady, uid, browserOffline, retryTick]);
}
