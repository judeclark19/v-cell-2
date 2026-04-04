import { AppDispatch } from "@/state/reduxStore";
import { Card, Move } from "@vcell/engine";
import { StartCardFlightArgs } from "./useCardFlight";
import { useCallback } from "react";
import { applyMoveThunk } from "@/state/game/thunks/applyMove";
import { resolveBoardSourceFromEl } from "./resolveMoveAttempt";

export function useTryAutoFoundation({
  boardRef,
  legalMoves,
  uid,
  dispatch,
  startCardFlight,
  getCardForSingleMove
}: {
  boardRef: React.RefObject<HTMLDivElement | null>;
  legalMoves: Move[];
  uid: string | null;
  dispatch: AppDispatch;
  startCardFlight: (args: StartCardFlightArgs) => void;
  getCardForSingleMove: (move: Move) => Card | null;
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
      if (card && toEl) {
        startCardFlight({
          fromEl: el,
          toEl,
          stack: [card],
          dropTarget: { type: "foundation", index: toIndex }
        });
      }
      // 4. Commit the move.
      dispatch(applyMoveThunk({ move: match, uid }));

      // 5. Return whether a move was made.
      return true;
    },
    [dispatch, startCardFlight, legalMoves, uid, getCardForSingleMove, boardRef]
  );

  return { tryAutoFoundation };
}
