import { useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { Rules } from "@vcell/engine";
import { selectSeed, setStatus, setUndosUsed } from "@/state/game/gameSlice";
import { bootSession } from "@/state/session/thunks/bootSession";
import { AppDispatch } from "@/state/reduxStore";
import {
  setStartedAtMs,
  selectSessionId,
  setTimeElapsedMs,
  setCheckpoint
} from "@/state/session/sessionSlice";
import { transitionGameAndSession } from "@/state/transitionGameAndSession";

type StartSessionMode =
  | { kind: "seed"; seed: string }
  | { kind: "seed+id"; seed: string; sessionId: string };

export type UseGameSessionParams = {
  rules: Rules;
};

export type UseGameSessionResult = {
  startNewDealSession: () => void;
  replaySeed: (seed: string) => void;

  // Useful for debugging / future extractions (kept private-ish but returned).
  startSession: (mode: StartSessionMode) => void;
};

/**
 * Owns the concept of a "game session": seed + sessionId + readiness, and the
 * choreography that resets all per-session state.
 */
export function useGameSession({
  rules
}: UseGameSessionParams): UseGameSessionResult {
  // Seed/sessionId are now owned by the RTK store.
  // Keep deterministic placeholders to avoid hydration mismatches.
  const seed = useSelector(selectSeed);
  const sessionId = useSelector(selectSessionId);
  const dispatch = useDispatch<AppDispatch>();

  // Prevent duplicate bootstraps (can happen due to hydration remounts in dev/prod).
  // We guard both per-mount (ref) and per-page-load (global) to avoid double-dispatch.
  const didBootstrapRef = useRef(false);

  const startSession = useCallback(
    (mode: StartSessionMode) => {
      console.debug("[useGameSession] startSession", {
        kind: mode.kind,
        seed: mode.seed,
        sessionId: mode.kind === "seed+id" ? mode.sessionId : undefined
      });

      const nextSeed = mode.seed;
      const nextSessionId =
        mode.kind === "seed+id" ? mode.sessionId : undefined;

      // If we’re already on this session, don’t reinitialize (prevents ready->hydrating churn).
      if (
        mode.kind === "seed+id" &&
        nextSeed === seed &&
        nextSessionId === sessionId
      ) {
        return;
      }

      dispatch(
        transitionGameAndSession({
          seed: nextSeed,
          sessionId: nextSessionId,
          rules
        })
      );
    },
    [dispatch, rules, seed, sessionId]
  );

  useEffect(() => {
    // If Redux has already hydrated a real session, do NOT reboot it.
    if (seed !== "seed-boot" && sessionId !== "session-boot") return;
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
  }, [dispatch, rules, seed, sessionId]);

  const startNewDealSession = useCallback(() => {
    dispatch(transitionGameAndSession({ rules }));
  }, [dispatch, rules]);

  const replaySeed = useCallback(
    (nextSeed: string) => {
      startSession({ kind: "seed", seed: nextSeed });
    },
    [startSession]
  );

  return {
    startNewDealSession,
    replaySeed,
    startSession
  };
}
