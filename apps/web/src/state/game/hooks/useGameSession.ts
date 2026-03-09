import { useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { Rules } from "@vcell/engine";
import { selectSeed, setStatus } from "@/state/game/gameSlice";
import {
  setUndosUsed,
  startSession as startSession_new
} from "@/state/game/gameSlice";
import { bootSession } from "@/state/session/thunks/bootSession";
import { AppDispatch } from "@/state/reduxStore";
import {
  setPaused,
  setSessionPhase,
  setStartedAtMs,
  setEndedAtMs,
  setGameId,
  selectGameId,
  setTimeElapsedMs,
  setCheckpoint
} from "@/state/session/sessionSlice";

type StartSessionMode =
  | { kind: "seed"; seed: string }
  | { kind: "seed+id"; seed: string; gameId: string };

export type UseGameSessionParams = {
  rules: Rules;
};

export type UseGameSessionResult = {
  seed: string;

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
  rules
}: UseGameSessionParams): UseGameSessionResult {
  // Seed/gameId are now owned by the RTK store.
  // Keep deterministic placeholders to avoid hydration mismatches.
  const seed = useSelector(selectSeed);
  const gameId = useSelector(selectGameId);
  const dispatch = useDispatch<AppDispatch>();

  // Prevent duplicate bootstraps (can happen due to hydration remounts in dev/prod).
  // We guard both per-mount (ref) and per-page-load (global) to avoid double-dispatch.
  const didBootstrapRef = useRef(false);

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

      dispatch(setSessionPhase("hydrating"));
      dispatch(setPaused(false));
      dispatch(setStartedAtMs(null));
      dispatch(setEndedAtMs(null));
      dispatch(setGameId(nextGameId));
      dispatch(setTimeElapsedMs(0));

      dispatch(setStatus(null));
      dispatch(setCheckpoint(null));

      dispatch(setUndosUsed(0));
      dispatch(setSessionPhase("ready"));
    },
    [dispatch, rules, seed, gameId]
  );

  useEffect(() => {
    // If Redux has already hydrated a real session, do NOT reboot it.
    if (seed !== "seed-boot" && gameId !== "game-boot") return;
    if (didBootstrapRef.current) return;
    didBootstrapRef.current = true;

    // Reset provider-owned per-session state once at boot.
    dispatch(setTimeElapsedMs(0));
    dispatch(setStatus("in_progress"));
    dispatch(setCheckpoint(null));

    dispatch(setUndosUsed(0));
    dispatch(setStartedAtMs(null));

    dispatch(bootSession({ rules })).catch((err) => {
      console.error("bootSession failed", err);
    });

    return () => {
      didBootstrapRef.current = false;
    };
  }, [dispatch, rules, seed, gameId]);

  const startNewDealSession = useCallback(() => {
    dispatch(startSession_new({ rules }));

    dispatch(setSessionPhase("ready"));
    dispatch(setPaused(false));
    dispatch(setStartedAtMs(null));
    dispatch(setEndedAtMs(null));
    dispatch(setTimeElapsedMs(0));
    dispatch(setStatus("in_progress"));
    dispatch(setCheckpoint(null));

    dispatch(setUndosUsed(0));
  }, [dispatch, rules]);

  const replaySeed = useCallback(
    (nextSeed: string) => {
      startSession({ kind: "seed", seed: nextSeed });
    },
    [startSession]
  );

  return {
    seed,
    startNewDealSession,
    replaySeed,
    startSession
  };
}
