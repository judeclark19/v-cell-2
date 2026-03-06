import { useMemo } from "react";
import { areAllCardsUnlocked } from "@vcell/engine";
import type { UndoLimit } from "@vcell/engine";
import { selectUndosRemaining, type HistoryState } from "@/state/game";
import { useSelector } from "react-redux";

export type UseGameDerivedStateParams = {
  history: HistoryState;
  undoLimit: UndoLimit;
};

export type UseGameDerivedStateResult = {
  isWon: boolean;
  undosRemaining: number; // Infinity when unlimited
};

export function useGameDerivedState({
  history
}: UseGameDerivedStateParams): UseGameDerivedStateResult {
  const isWon = useMemo(
    () => areAllCardsUnlocked(history.present),
    [history.present]
  );

  const undosRemaining = useSelector(selectUndosRemaining);

  // const canUndo = useMemo(() => {
  //   return (
  //     !isWon &&
  //     history.past.length > 0 &&
  //     (undoLimit === "unlimited" || undosRemaining > 0)
  //   );
  // }, [isWon, history.past.length, undoLimit, undosRemaining]);

  return { isWon, undosRemaining };
}
