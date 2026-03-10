import {
  applyMove,
  areAllCardsUnlocked,
  type GameState,
  type Move,
  type Rules
} from "@vcell/engine";

export function areRulesEqual(a: Rules, b: Rules): boolean {
  return (
    a.allowFoundationPullback === b.allowFoundationPullback &&
    a.undoLimit === b.undoLimit &&
    a.faceDownCount === b.faceDownCount
  );
}

export function computePostMoveResult({
  moveToApply,
  currentCursor,
  currentMoves,
  currentStatus,
  currentPresent
}: {
  moveToApply: Move;
  currentCursor: number;
  currentMoves: Move[];
  currentStatus: "in_progress" | "won" | "abandoned" | null;
  currentPresent: GameState;
}) {
  const truncated = currentMoves.slice(0, currentCursor);
  const nextMoves = [...truncated, moveToApply];
  const nextCursor = currentCursor + 1;

  const next = applyMove(currentPresent, moveToApply);
  const didWin = currentStatus !== "won" && areAllCardsUnlocked(next);
  const shouldCheckpoint = nextCursor > 0 && nextCursor % 20 === 0;

  return {
    next,
    nextMoves,
    nextCursor,
    didWin,
    shouldCheckpoint
  };
}
