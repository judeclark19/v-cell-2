import { AppDispatch } from "@/state/reduxStore";
import { Move } from "@vcell/engine";
import { CardFlightDropTarget } from "./useCardFlight";
import { useCallback } from "react";
import { BoardSource } from "./useBoardControlSystem";
import { applyMoveThunk } from "@/state/game/thunks/applyMove";

export function useTryAutoFoundation({
  legalMoves,
  uid,
  dispatch,
  getFoundationDropEl,
  startCardFlight,
  clearCardFlight,
  resolveBoardSourceFromEl
}: {
  legalMoves: Move[];
  uid: string | null;
  dispatch: AppDispatch;
  getFoundationDropEl: (index: number) => HTMLElement | null;
  startCardFlight: (args: {
    cardIds: string[];
    dropTarget: CardFlightDropTarget;
  }) => void;
  clearCardFlight: () => void;
  resolveBoardSourceFromEl: (el: HTMLElement) => BoardSource | null;
}) {
  const tryAutoFoundation = useCallback(
    (el: HTMLElement) => {
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

      // 3. If flight data is available, start kb flight.
      const cardId = el.dataset.cardId;
      const toIndex = match.to.index;

      if (cardId) {
        startCardFlight({
          cardIds: [cardId],
          dropTarget: { type: "foundation", index: toIndex }
        });
      }

      // 4. Commit the move.
      dispatch(applyMoveThunk({ move: match, uid }));
      requestAnimationFrame(() => {
        clearCardFlight();
      });

      // 5. Return whether a move was made.
      return true;
    },
    [
      dispatch,
      startCardFlight,
      legalMoves,
      uid,
      clearCardFlight,
      resolveBoardSourceFromEl
    ]
  );

  return { tryAutoFoundation };
}
