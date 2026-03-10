import { useEffect, useMemo, useRef } from "react";
import type { GameState, Move } from "@vcell/engine";
import { useSelector } from "react-redux";
import { selectCanUndo, selectSeed, selectUndosUsed } from "../gameSlice";
import {
  selectPaused,
  selectEndedAtMs,
  selectCheckpoint
} from "@/state/session/sessionSlice";

// A persistable-ish snapshot of the current game state for debugging / DB modeling.
export type GameSnapshot = {
  sessionId: string;
  seed: string;
  rules: GameState["rules"];
  paused: boolean;
  canUndo: boolean;
  moveCount: number; // number of moves made in the current timeline (net of undos)
  undosUsed: number;
  moves: Move[];
  cursor: number;
  // Keep the full engine state in the snapshot so we can inspect it when debugging.
  state: GameState;
};

function diffKeys(prev: GameSnapshot | null, next: GameSnapshot): string[] {
  if (!prev) return ["(initial)"];
  const changed: string[] = [];
  (Object.keys(next) as (keyof GameSnapshot)[]).forEach((k) => {
    // Cheap comparison: primitives by value; objects by reference.
    // This is fine for console visibility; not meant for deep-equality.
    if (prev[k] !== next[k]) changed.push(String(k));
  });
  return changed;
}

export type UseGameSnapshotLoggerParams = {
  sessionId: string;
  state: GameState;
  moveCount: number;
  moves: Move[];
  cursor: number;
};

/**
 * Dev-only snapshot logger.
 *
 * Keeps a full snapshot ref (including `timeElapsedMs`) but excludes `timeElapsedMs`
 * from the change signature so timer ticks don't flood the console.
 */
export function useGameSnapshotLogger(params: UseGameSnapshotLoggerParams) {
  // session state
  const endedAtMs = useSelector(selectEndedAtMs);
  const paused = useSelector(selectPaused);
  const checkpoint = useSelector(selectCheckpoint);
  // game state
  const seed = useSelector(selectSeed);
  const undosUsed = useSelector(selectUndosUsed);
  const canUndo = useSelector(selectCanUndo);

  const { sessionId, state, moveCount, moves, cursor } = params;

  const gameSnapshot = useMemo<GameSnapshot>(
    () => ({
      sessionId,
      seed,
      rules: state.rules,
      canUndo,
      moveCount,
      undosUsed,
      endedAtMs,
      paused,
      state,
      moves,
      cursor,
      checkpoint
    }),
    [
      sessionId,
      seed,
      state,
      canUndo,
      moveCount,
      undosUsed,
      endedAtMs,
      moves,
      cursor,
      checkpoint,
      paused
    ]
  );

  // Keep `timeElapsedMs` inside the snapshot, but exclude it from the LOG signature.
  const logSnapshot = useMemo<GameSnapshot>(
    () => ({
      sessionId,
      seed,
      rules: state.rules,
      paused,
      canUndo,
      moveCount,
      undosUsed,
      endedAtMs,
      state,
      moves,
      cursor,
      checkpoint
    }),
    [
      sessionId,
      seed,
      state,
      endedAtMs,
      canUndo,
      moveCount,
      undosUsed,
      moves,
      cursor,
      checkpoint,
      paused
    ]
  );

  const gameSnapshotRef = useRef<GameSnapshot>(gameSnapshot);
  useEffect(() => {
    gameSnapshotRef.current = gameSnapshot;
  }, [gameSnapshot]);

  const prevLogSnapshotRef = useRef<GameSnapshot | null>(null);

  useEffect(() => {
    const prev = prevLogSnapshotRef.current;
    const changed = diffKeys(prev, logSnapshot);

    // Avoid noisy logs if somehow nothing changed.
    if (prev && changed.length === 0) return;

    prevLogSnapshotRef.current = logSnapshot;
  }, [logSnapshot]);
}
