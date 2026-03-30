import { AppDispatch } from "@/state/reduxStore";
import { Card, Move } from "@vcell/engine";
import { DropTarget } from "./useCardFlight";
import { useCallback } from "react";
import { applyMoveThunk } from "@/state/game/thunks/applyMove";
import { resolveBoardSourceFromEl } from "./resolveMoveAttempt";

export function useTryAutoFoundation({
  legalMoves,
  uid,
  dispatch,
  startCardFlight,
  foundationCards,
  tableauCards,
  freeCellCards
}: {
  legalMoves: Move[];
  uid: string | null;
  dispatch: AppDispatch;
  startCardFlight: (args: {
    fromEl: HTMLElement;
    toEl: HTMLElement;
    stack: Card[];
    dropTarget: DropTarget;
    durationMs?: number;
  }) => void;
  foundationCards: Array<Card | null>;
  tableauCards: Array<Array<{ card: Card; faceDown: boolean }>>;
  freeCellCards: Array<Card | null>;
}) {
  const getCardForSingleMove = useCallback(
    (move: Move): Card | null => {
      if (move.kind !== "single") return null;

      if (move.from.type === "tableau") {
        const column = tableauCards[move.from.index];
        return column?.[column.length - 1]?.card ?? null;
      }

      if (move.from.type === "freecell") {
        return freeCellCards[move.from.index] ?? null;
      }

      if (move.from.type === "foundation") {
        return foundationCards[move.from.index] ?? null;
      }

      return null;
    },
    [tableauCards, foundationCards, freeCellCards]
  );

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

      // const toEl = getFoundationDropEl(toIndex);
      const toEl = document.querySelector(
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
    [
      dispatch,
      startCardFlight,
      legalMoves,
      uid,
      getCardForSingleMove
      // getFoundationDropEl
    ]
  );

  return { tryAutoFoundation };
}
