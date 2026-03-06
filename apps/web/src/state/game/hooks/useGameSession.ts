import { useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { GameState, Rules } from "@vcell/engine";
import {
  selectSeed,
  selectGameId,
  resetPerSessionState,
  setStatus,
  setTimeElapsedMs
} from "@/state/game";
import { startSession as startSession_new } from "@/state/game/gameSlice";
import { bootSession } from "@/state/session";
import { AppDispatch } from "@/state/reduxStore";
import { setPaused, setSessionPhase } from "@/state/session/sessionSlice";

type StartSessionMode =
  | { kind: "seed"; seed: string }
  | { kind: "seed+id"; seed: string; gameId: string };

export type UseGameSessionParams = {
  rules: Rules;

  // State setters owned by GameProvider
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
  setCheckpoint
}: UseGameSessionParams): UseGameSessionResult {
  // Seed/gameId are now owned by the RTK store.
  // Keep deterministic placeholders to avoid hydration mismatches.
  const seed = useSelector(selectSeed);
  const gameId = useSelector(selectGameId);
  const dispatch = useDispatch<AppDispatch>();

  // Prevent duplicate bootstraps (can happen due to hydration remounts in dev/prod).
  // We guard both per-mount (ref) and per-page-load (global) to avoid double-dispatch.
  const didBootstrapRef = useRef(false);

  const resetPerSessionState_old = useCallback(() => {
    // TODO make this a whole reducer that sets all the values
    dispatch(setTimeElapsedMs(0));
    // setIsAbandoned(false);
    dispatch(setStatus("in_progress"));
    setCheckpoint(null);

    dispatch(resetPerSessionState());

    // call reeucer resetPerSessionState from redux game
  }, [setCheckpoint, dispatch]);

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

      resetPerSessionState_old();
    },
    [dispatch, rules, resetPerSessionState_old, seed, gameId]
  );

  useEffect(() => {
    // If Redux has already hydrated a real session, do NOT reboot it.
    if (seed !== "seed-boot" && gameId !== "game-boot") return;
    if (didBootstrapRef.current) return;
    didBootstrapRef.current = true;

    // Reset provider-owned per-session state once at boot.
    resetPerSessionState_old();

    dispatch(bootSession({ rules })).catch((err) => {
      console.error("bootSession failed", err);
    });

    return () => {
      didBootstrapRef.current = false;
    };
  }, [dispatch, rules, resetPerSessionState_old, seed, gameId]);

  const startNewDealSession = useCallback(() => {
    dispatch(startSession_new({ rules }));
    dispatch(setSessionPhase("ready"));
    dispatch(setPaused(false));
    resetPerSessionState_old();
  }, [dispatch, rules, resetPerSessionState_old]);

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
