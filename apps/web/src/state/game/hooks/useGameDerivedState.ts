import { useMemo } from "react";
import { areAllCardsUnlocked } from "@vcell/engine";
import type { UndoLimit } from "@vcell/engine";
import type { HistoryState } from "@/state/game";

export type UseGameDerivedStateParams = {
  history: HistoryState;
  undoLimit: UndoLimit;
  undosUsed: number;
};

export type UseGameDerivedStateResult = {
  isWon: boolean;
  undosRemaining: number; // Infinity when unlimited
  canUndo: boolean;
};

export function useGameDerivedState({
  history,
  undoLimit,
  undosUsed
}: UseGameDerivedStateParams): UseGameDerivedStateResult {
  const isWon = useMemo(
    () => areAllCardsUnlocked(history.present),
    [history.present]
  );

  const undosRemaining = useMemo(() => {
    if (undoLimit === "unlimited") return Number.POSITIVE_INFINITY;
    return Math.max(0, undoLimit - undosUsed);
  }, [undoLimit, undosUsed]);

  const canUndo = useMemo(() => {
    return (
      !isWon &&
      history.past.length > 0 &&
      (undoLimit === "unlimited" || undosRemaining > 0)
    );
  }, [isWon, history.past.length, undoLimit, undosRemaining]);

  return { isWon, undosRemaining, canUndo };
}
