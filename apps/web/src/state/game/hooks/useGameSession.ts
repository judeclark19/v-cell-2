import { useCallback, useEffect, useRef, useState } from "react";
import { createGame } from "@vcell/engine";
import type { GameState, Rules, Move } from "@vcell/engine";

type HistoryState = {
  present: GameState;
  past: GameState[];
};

type StartSessionMode =
  | { kind: "new" }
  | { kind: "seed"; seed: string }
  | { kind: "seed+id"; seed: string; gameId: string };

function makeNewSeed(): string {
  return crypto.randomUUID();
}

function makeNewGameId(): string {
  return crypto.randomUUID();
}

export type UseGameSessionParams = {
  rules: Rules;

  // Use these as deps for the "rule changes => reseed" effect.
  allowFoundationPullback: boolean;
  undoLimit: Rules["undoLimit"];

  // State setters owned by GameProvider
  setHistory: React.Dispatch<React.SetStateAction<HistoryState>>;
  setTimeElapsedMs: React.Dispatch<React.SetStateAction<number>>;
  setHasStarted: React.Dispatch<React.SetStateAction<boolean>>;
  setStartedAtMs: React.Dispatch<React.SetStateAction<number | null>>;
  setEndedAtMs: React.Dispatch<React.SetStateAction<number | null>>;
  setIsAbandoned: React.Dispatch<React.SetStateAction<boolean>>;
  setUndosUsed: React.Dispatch<React.SetStateAction<number>>;
  setMoveCount: React.Dispatch<React.SetStateAction<number>>;
  setMoves: React.Dispatch<React.SetStateAction<Move[]>>;
  setCursor: React.Dispatch<React.SetStateAction<number>>;
  cursorRef: React.RefObject<number>;
  setCheckpoint: React.Dispatch<
    React.SetStateAction<{ at: number; state: GameState } | null>
  >;
};

export type UseGameSessionResult = {
  seed: string;
  gameId: string;
  seedReady: boolean;

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
  allowFoundationPullback,
  undoLimit,

  setHistory,
  setTimeElapsedMs,
  setHasStarted,
  setStartedAtMs,
  setEndedAtMs,
  setIsAbandoned,
  setUndosUsed,
  setMoveCount,
  setMoves,
  setCursor,
  cursorRef,
  setCheckpoint
}: UseGameSessionParams): UseGameSessionResult {
  // Seed is initialized to a deterministic placeholder to avoid hydration mismatches.
  const [seed, setSeed] = useState<string>("seed-init");
  const [gameId, setGameId] = useState<string>("game-init");
  const [seedReady, setSeedReady] = useState<boolean>(false);

  const startSession = useCallback(
    (mode: StartSessionMode) => {
      const nextSeed = mode.kind === "new" ? makeNewSeed() : mode.seed;
      const nextGameId =
        mode.kind === "seed+id" ? mode.gameId : makeNewGameId();

      setSeed(nextSeed);
      setGameId(nextGameId);

      // New session.
      setHistory({ present: createGame(nextSeed, rules), past: [] });
      setTimeElapsedMs(0);
      setHasStarted(false);
      setStartedAtMs(null);
      setEndedAtMs(null);
      setIsAbandoned(false);
      setUndosUsed(0);
      setMoveCount(0);
      setMoves([]);
      setCursor(0);
      cursorRef.current = 0;
      setCheckpoint(null);
    },
    [
      rules,
      setHistory,
      setTimeElapsedMs,
      setHasStarted,
      setStartedAtMs,
      setEndedAtMs,
      setIsAbandoned,
      setUndosUsed,
      setMoveCount,
      setMoves,
      setCursor,
      cursorRef,
      setCheckpoint
    ]
  );

  // ---------------------------------------------------------------------------
  // Client-only seed init (avoids hydration mismatches)
  // ---------------------------------------------------------------------------
  const didInitRandomSeedRef = useRef(false);

  useEffect(() => {
    if (didInitRandomSeedRef.current) return;
    didInitRandomSeedRef.current = true;

    startSession({ kind: "new" });
    setSeedReady(true);
  }, [startSession]);

  // ---------------------------------------------------------------------------
  // Rule changes => start a NEW game (reseed)
  // ---------------------------------------------------------------------------
  const didApplyRulesEffectOnceRef = useRef(false);

  useEffect(() => {
    // Skip initial mount; otherwise we can clobber the client-only random seed init.
    if (!didApplyRulesEffectOnceRef.current) {
      didApplyRulesEffectOnceRef.current = true;
      return;
    }

    startSession({ kind: "new" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowFoundationPullback, undoLimit]);

  const startNewDealSession = useCallback(() => {
    startSession({ kind: "new" });
  }, [startSession]);

  const replaySeed = useCallback(
    (nextSeed: string) => {
      startSession({ kind: "seed", seed: nextSeed });
    },
    [startSession]
  );

  return {
    seed,
    gameId,
    seedReady,
    startNewDealSession,
    replaySeed,
    startSession
  };
}
