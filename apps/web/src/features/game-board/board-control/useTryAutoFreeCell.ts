import { Move, Card } from "@vcell/engine";
import { resolveBoardSourceFromEl } from "./resolveMoveAttempt";
import { useCallback } from "react";
import type { PerformMoveArgs } from "./useBoardControlSystem";

export function useTryAutoFreeCell({
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
  const tryAutoFreeCell = useCallback(
    (el: HTMLElement): boolean => {
      // 1. Resolve the board source from the element.
      const from = resolveBoardSourceFromEl(el);
      if (!from) return false;

      // 2. Find legal single-card moves from this source to a free cell.
      const candidates = legalMoves
        .filter((m) => {
          if (m.kind !== "single") return false;
          if (m.to.type !== "freecell") return false;

          if (from.type === "tableau") {
            return m.from.type === "tableau" && m.from.index === from.index;
          }

          return m.from.type === from.type && m.from.index === from.index;
        })
        .sort((a, b) => a.to.index - b.to.index);

      const move = candidates[0];
      if (!move) return false;

      const toEl = boardRef.current?.querySelector(
        `.pile-slot[data-region="freecell"][data-region-index="${move.to.index}"]`
      ) as HTMLDivElement | null;

      // 3. Commit the move.
      const cardToMove = getCardForSingleMove(move);
      return performMove(
        cardToMove && toEl
          ? {
              move,
              fromEl: el,
              toEl,
              stack: [cardToMove],
              dropTarget: { type: "freecell", index: move.to.index }
            }
          : { move }
      );
    },
    [boardRef, getCardForSingleMove, legalMoves, performMove]
  );

  return { tryAutoFreeCell };
}
