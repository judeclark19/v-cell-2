import { useEffect, useMemo, useRef } from "react";
import type { GameState, Move } from "@vcell/engine";

// A persistable-ish snapshot of the current game state for debugging / DB modeling.
// Intentionally excludes `timeElapsedMs` from the LOG signature so timer ticks don't spam logs.
export type GameSnapshot = {
  gameId: string;
  seed: string;
  rules: GameState["rules"];
  hasStarted: boolean;
  isAbandoned: boolean;
  paused: boolean;
  canUndo: boolean;
  moveCount: number; // number of moves made in the current timeline (net of undos)
  undosUsed: number;
  moves: Move[];
  cursor: number;
  checkpoint: { at: number; state: GameState } | null;
  timeElapsedMs: number;
  startedAtMs: number | null;
  endedAtMs: number | null;
  // Keep the full engine state in the snapshot so we can inspect it when debugging.
  state: GameState;
};

export type LogSnapshot = Omit<GameSnapshot, "timeElapsedMs">;

function diffKeys(prev: LogSnapshot | null, next: LogSnapshot): string[] {
  if (!prev) return ["(initial)"];
  const changed: string[] = [];
  (Object.keys(next) as (keyof LogSnapshot)[]).forEach((k) => {
    // Cheap comparison: primitives by value; objects by reference.
    // This is fine for console visibility; not meant for deep-equality.
    if (prev[k] !== next[k]) changed.push(String(k));
  });
  return changed;
}

export type UseGameSnapshotLoggerParams = {
  gameId: string;
  seed: string;
  state: GameState;

  hasStarted: boolean;
  isAbandoned: boolean;
  paused: boolean;
  canUndo: boolean;

  moveCount: number;
  undosUsed: number;
  timeElapsedMs: number;
  startedAtMs: number | null;
  endedAtMs: number | null;

  moves: Move[];
  cursor: number;
  checkpoint: { at: number; state: GameState } | null;
};

/**
 * Dev-only snapshot logger.
 *
 * Keeps a full snapshot ref (including `timeElapsedMs`) but excludes `timeElapsedMs`
 * from the change signature so timer ticks don't flood the console.
 */
export function useGameSnapshotLogger(params: UseGameSnapshotLoggerParams) {
  const {
    gameId,
    seed,
    state,
    hasStarted,
    isAbandoned,
    paused,
    canUndo,
    moveCount,
    undosUsed,
    timeElapsedMs,
    startedAtMs,
    endedAtMs,
    moves,
    cursor,
    checkpoint
  } = params;

  const gameSnapshot = useMemo<GameSnapshot>(
    () => ({
      gameId,
      seed,
      rules: state.rules,
      hasStarted,
      isAbandoned,
      paused,
      canUndo,
      moveCount,
      undosUsed,
      timeElapsedMs,
      startedAtMs,
      endedAtMs,
      state,
      moves,
      cursor,
      checkpoint
    }),
    [
      gameId,
      seed,
      state,
      hasStarted,
      isAbandoned,
      paused,
      canUndo,
      moveCount,
      undosUsed,
      timeElapsedMs,
      startedAtMs,
      endedAtMs,
      moves,
      cursor,
      checkpoint
    ]
  );

  // Keep `timeElapsedMs` inside the snapshot, but exclude it from the LOG signature.
  const logSnapshot = useMemo<LogSnapshot>(
    () => ({
      gameId,
      seed,
      rules: state.rules,
      hasStarted,
      isAbandoned,
      paused,
      canUndo,
      moveCount,
      undosUsed,
      startedAtMs,
      endedAtMs,
      state,
      moves,
      cursor,
      checkpoint
    }),
    [
      gameId,
      seed,
      state,
      hasStarted,
      isAbandoned,
      paused,
      canUndo,
      moveCount,
      undosUsed,
      startedAtMs,
      endedAtMs,
      moves,
      cursor,
      checkpoint
    ]
  );

  const gameSnapshotRef = useRef<GameSnapshot>(gameSnapshot);
  useEffect(() => {
    gameSnapshotRef.current = gameSnapshot;
  }, [gameSnapshot]);

  const prevLogSnapshotRef = useRef<LogSnapshot | null>(null);

  useEffect(() => {
    const prev = prevLogSnapshotRef.current;
    const changed = diffKeys(prev, logSnapshot);

    // Avoid noisy logs if somehow nothing changed.
    if (prev && changed.length === 0) return;

    prevLogSnapshotRef.current = logSnapshot;
  }, [logSnapshot]);
}
