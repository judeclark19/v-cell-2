import { useMemo } from "react";
import { areAllCardsUnlocked } from "@vcell/engine";
import type { GameState, UndoLimit } from "@vcell/engine";

export type UseGameDerivedStateParams = {
  state: GameState;
  pastLength: number;
  undoLimit: UndoLimit;
  undosUsed: number;
};

export type UseGameDerivedStateResult = {
  isWon: boolean;
  undosRemaining: number; // Infinity when unlimited
  canUndo: boolean;
};

export function useGameDerivedState({
  state,
  pastLength,
  undoLimit,
  undosUsed
}: UseGameDerivedStateParams): UseGameDerivedStateResult {
  const isWon = useMemo(() => areAllCardsUnlocked(state), [state]);

  const undosRemaining = useMemo(() => {
    if (undoLimit === "unlimited") return Number.POSITIVE_INFINITY;
    return Math.max(0, undoLimit - undosUsed);
  }, [undoLimit, undosUsed]);

  const canUndo = useMemo(() => {
    return (
      !isWon &&
      pastLength > 0 &&
      (undoLimit === "unlimited" || undosRemaining > 0)
    );
  }, [isWon, pastLength, undoLimit, undosRemaining]);

  return { isWon, undosRemaining, canUndo };
}
