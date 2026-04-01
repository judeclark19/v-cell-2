import { Move, Card } from "@vcell/engine";
import { resolveBoardSourceFromEl } from "./resolveMoveAttempt";
import { StartCardFlightArgs } from "./useCardFlight";
import { applyMoveThunk } from "@/state/game/thunks/applyMove";
import { AppDispatch } from "@/state/reduxStore";
import { useCallback } from "react";

export function useTryAutoFreeCell({
  legalMoves,
  startCardFlight,
  getCardForSingleMove,
  dispatch,
  uid
}: {
  legalMoves: Move[];
  startCardFlight: (args: StartCardFlightArgs) => void;
  getCardForSingleMove: (move: Move) => Card | null;
  dispatch: AppDispatch;
  uid: string | null;
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

      const toEl = document.querySelector(
        `.pile-slot[data-region="freecell"][data-region-index="${move.to.index}"]`
      ) as HTMLDivElement | null;

      // 3. Commit the move.
      const cardToMove = getCardForSingleMove(move);
      if (cardToMove && toEl) {
        startCardFlight({
          fromEl: el,
          toEl: toEl!,
          stack: [cardToMove],
          dropTarget: { type: "freecell", index: move.to.index }
        });
      }

      dispatch(applyMoveThunk({ move, uid }));

      // 4. Return whether a move was made.
      return true;
    },
    [dispatch, legalMoves, uid, getCardForSingleMove, startCardFlight]
  );

  return { tryAutoFreeCell };
}
