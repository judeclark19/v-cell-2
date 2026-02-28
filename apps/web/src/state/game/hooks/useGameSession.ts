import { useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { GameState, Rules } from "@vcell/engine";
import { getInProgressGameForDevice } from "@/persistence/inProgressGamesStore";
import { getOrCreateDeviceId } from "@/persistence/schema";
import {
  startSession as startSession_new,
  selectSeed,
  selectGameId,
  finalizeHydration
} from "@/state/gameStore_new";

type StartSessionMode =
  | { kind: "seed"; seed: string }
  | { kind: "seed+id"; seed: string; gameId: string };

export type UseGameSessionParams = {
  rules: Rules;

  // State setters owned by GameProvider
  setTimeElapsedMs: React.Dispatch<React.SetStateAction<number>>;
  setHasStarted: React.Dispatch<React.SetStateAction<boolean>>;
  setStartedAtMs: React.Dispatch<React.SetStateAction<number | null>>;
  setEndedAtMs: React.Dispatch<React.SetStateAction<number | null>>;
  setIsAbandoned: React.Dispatch<React.SetStateAction<boolean>>;
  setUndosUsed: React.Dispatch<React.SetStateAction<number>>;
  setCheckpoint: React.Dispatch<
    React.SetStateAction<{ at: number; state: GameState } | null>
  >;
};

export type UseGameSessionResult = {
  seed: string;
  gameId: string;

  startNewDealSession: () => void;
  replaySeed: (seed: string) => void;

  // Useful for debugging / future extractions (kept private-ish but returned).
  startSession: (mode: StartSessionMode) => void;
};

/**
 * Owns the concept of a "game session": seed + gameId + readiness, and the
 * choreography that resets all per-session state.
 */
export function useGameSession({
  rules,
  setTimeElapsedMs,
  setHasStarted,
  setStartedAtMs,
  setEndedAtMs,
  setIsAbandoned,
  setUndosUsed,
  setCheckpoint
}: UseGameSessionParams): UseGameSessionResult {
  // Seed/gameId are now owned by the RTK store.
  // Keep deterministic placeholders to avoid hydration mismatches.
  const seed = useSelector(selectSeed);
  const gameId = useSelector(selectGameId);
  const dispatch = useDispatch();

  // Prevent duplicate bootstraps (can happen due to hydration remounts in dev/prod).
  // We guard both per-mount (ref) and per-page-load (global) to avoid double-dispatch.
  const didBootstrapRef = useRef(false);

  const resetPerSessionState = useCallback(() => {
    setTimeElapsedMs(0);
    setHasStarted(false);
    setStartedAtMs(null);
    setEndedAtMs(null);
    setIsAbandoned(false);
    setUndosUsed(0);
    setCheckpoint(null);
  }, [
    setTimeElapsedMs,
    setHasStarted,
    setStartedAtMs,
    setEndedAtMs,
    setIsAbandoned,
    setUndosUsed,
    setCheckpoint
  ]);

  const startSession = useCallback(
    (mode: StartSessionMode) => {
      console.debug("[useGameSession] startSession", {
        kind: mode.kind,
        seed: mode.seed,
        gameId: mode.kind === "seed+id" ? mode.gameId : undefined
      });

      const nextSeed = mode.seed;
      const nextGameId = mode.kind === "seed+id" ? mode.gameId : undefined;

      // If we’re already on this session, don’t reinitialize (prevents ready->hydrating churn).
      if (
        mode.kind === "seed+id" &&
        nextSeed === seed &&
        nextGameId === gameId
      ) {
        return;
      }

      dispatch(
        startSession_new({
          rules,
          seed: nextSeed,
          ...(nextGameId ? { gameId: nextGameId } : {})
        })
      );

      resetPerSessionState();
    },
    [dispatch, rules, resetPerSessionState, seed, gameId]
  );

  useEffect(() => {
    // If Redux has already hydrated a real session, do NOT reboot it.
    if (seed !== "seed-boot" && gameId !== "game-boot") return;
    // Per-mount guard
    if (didBootstrapRef.current) return;
    didBootstrapRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        const deviceId = getOrCreateDeviceId();
        const saved = await getInProgressGameForDevice(deviceId);

        if (cancelled) return;

        if (
          saved &&
          saved.seed !== "seed-boot" &&
          saved.gameId !== "game-boot"
        ) {
          startSession({
            kind: "seed+id",
            seed: saved.seed,
            gameId: saved.gameId
          });
        } else {
          dispatch(startSession_new({ rules }));
          dispatch(finalizeHydration());
          resetPerSessionState();
        }
      } catch (err) {
        console.error(
          "Failed to bootstrap session from in-progress games",
          err
        );

        if (cancelled) return;
        dispatch(startSession_new({ rules }));
        dispatch(finalizeHydration());
        resetPerSessionState();
      }
    })();

    return () => {
      cancelled = true;
      didBootstrapRef.current = false;
    };
  }, [dispatch, rules, resetPerSessionState, startSession, seed, gameId]);

  const startNewDealSession = useCallback(() => {
    dispatch(startSession_new({ rules }));
    dispatch(finalizeHydration());
    resetPerSessionState();
  }, [dispatch, rules, resetPerSessionState]);

  const replaySeed = useCallback(
    (nextSeed: string) => {
      startSession({ kind: "seed", seed: nextSeed });
    },
    [startSession]
  );

  return {
    seed,
    gameId,
    startNewDealSession,
    replaySeed,
    startSession
  };
}
