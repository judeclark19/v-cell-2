import { Card, Move } from "@vcell/engine";
import { useCallback } from "react";
import { resolveBoardSourceFromEl } from "./resolveMoveAttempt";
import type { PerformMoveArgs } from "./useBoardControlSystem";

export function useTryAutoFoundation({
  boardRef,
  legalMoves,
  getCardForSingleMove,
  performMove
}: {
  boardRef: React.RefObject<HTMLDivElement | null>;
  legalMoves: Move[];
  getCardForSingleMove: (move: Move) => Card | null;
  performMove: (args: PerformMoveArgs) => boolean;
}) {
  const tryAutoFoundation = useCallback(
    (el: HTMLElement): boolean => {
      // 1. Resolve the board source from the element.
      const from = resolveBoardSourceFromEl(el);
      if (!from) return false;

      // 2. Find the matching legal single-card move to a foundation.
      const match = legalMoves.find(
        (m) =>
          m.kind === "single" &&
          m.from.type === from.type &&
          m.from.index === from.index &&
          m.to.type === "foundation"
      );

      if (!match) return false;

      // 3. If flight data is available, start card flight.
      const toIndex = match.to.index;

      const toEl = boardRef.current?.querySelector(
        `.pile-slot[data-region="foundation"][data-region-index="${toIndex}"]`
      ) as HTMLDivElement | null;

      const card = getCardForSingleMove(match);
      return performMove(
        card && toEl
          ? {
              move: match,
              fromEl: el,
              toEl,
              stack: [card],
              dropTarget: { type: "foundation", index: toIndex }
            }
          : { move: match }
      );
    },
    [boardRef, getCardForSingleMove, legalMoves, performMove]
  );

  return { tryAutoFoundation };
}
