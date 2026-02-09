import { useCallback, useEffect, useRef, useState } from "react";
import { createGame } from "@vcell/engine";
import type { GameState, Rules, Move } from "@vcell/engine";
import { HistoryState } from "../GameProvider";
import { getMostRecentInProgressGame } from "@/persistence/inProgressGamesStore";

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
  faceDownCount: Rules["faceDownCount"];

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
  faceDownCount,

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

  const startSessionRef = useRef(startSession);

  useEffect(() => {
    startSessionRef.current = startSession;
  }, [startSession]);

  // ---------------------------------------------------------------------------
  // Client-only bootstrap (resume most recent in-progress game if present)
  // ---------------------------------------------------------------------------
  const didInitRandomSeedRef = useRef(false);

  useEffect(() => {
    if (didInitRandomSeedRef.current) return;
    console.log("[boot] starting bootstrap");
    didInitRandomSeedRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        const mostRecent = await getMostRecentInProgressGame();
        console.log(
          "[boot] mostRecent",
          mostRecent
            ? { gameId: mostRecent.gameId, updatedAtMs: mostRecent.updatedAtMs }
            : null
        );
        if (cancelled) return;

        if (mostRecent) {
          console.log("[boot] startSession resume", {
            gameId: mostRecent!.gameId
          });
          startSessionRef.current({
            kind: "seed+id",
            seed: mostRecent.seed,
            gameId: mostRecent.gameId
          });
        } else {
          console.log("[boot] startSession new");
          startSessionRef.current({ kind: "new" });
        }

        setSeedReady(true);
      } catch (err) {
        console.error(
          "Failed to bootstrap session from in-progress games",
          err
        );

        if (cancelled) return;
        console.log("[boot] startSession new");
        startSessionRef.current({ kind: "new" });
        setSeedReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const startNewDealSession = useCallback(() => {
    console.log("[boot] startSession new");
    startSession({ kind: "new" });
  }, [startSession]);

  const replaySeed = useCallback(
    (nextSeed: string) => {
      console.log("[boot] startSession resume", { seed: nextSeed });
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
