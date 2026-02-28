import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { GameState, Rules } from "@vcell/engine";
import { getInProgressGameForDevice } from "@/persistence/inProgressGamesStore";
import { getOrCreateDeviceId } from "@/persistence/schema";
import {
  startSession as startSession_new,
  selectSeed,
  selectGameId
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
      const nextSeed = mode.seed;
      const nextGameId = mode.kind === "seed+id" ? mode.gameId : undefined;

      dispatch(
        startSession_new({
          rules,
          seed: nextSeed,
          ...(nextGameId ? { gameId: nextGameId } : {})
        })
      );

      resetPerSessionState();
    },
    [dispatch, rules, resetPerSessionState]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const deviceId = getOrCreateDeviceId();
        const saved = await getInProgressGameForDevice(deviceId);

        if (cancelled) return;

        if (saved) {
          startSession({
            kind: "seed+id",
            seed: saved.seed,
            gameId: saved.gameId
          });
        } else {
          dispatch(startSession_new({ rules }));
          resetPerSessionState();
        }
      } catch (err) {
        console.error(
          "Failed to bootstrap session from in-progress games",
          err
        );

        if (cancelled) return;
        dispatch(startSession_new({ rules }));
        resetPerSessionState();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch, rules, resetPerSessionState, startSession]);

  const startNewDealSession = useCallback(() => {
    dispatch(startSession_new({ rules }));
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
