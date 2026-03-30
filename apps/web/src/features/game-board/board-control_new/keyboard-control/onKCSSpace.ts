import { Card, Move } from "@vcell/engine";
import {
  getPileRefFromElement,
  resolveBoardSourceFromEl,
  resolveMoveAttempt
} from "../resolveMoveAttempt";
import { startKbCarrying, stopKbCarrying } from "./keyboardCarrying";
import { AppDispatch } from "@/state/reduxStore";
import { applyMoveThunk } from "@/state/game/thunks/applyMove";
import { KBCarryRefs, KBCarryState } from "./useKeyboardControlSystem";
import { RefObject } from "react";
import { StartCardFlightArgs } from "../useCardFlight";

function findTableauTailAnchorEl(
  root: HTMLElement | null,
  colIndex: number
): HTMLElement | null {
  if (!root) return null;

  return (
    root.querySelector<HTMLElement>(
      `[data-tableau-tail-anchor='true'][data-tableau-col='${colIndex}']`
    ) ?? null
  );
}

export const onKCSSpace = (
  e: React.KeyboardEvent<HTMLDivElement>,
  boardRef: React.RefObject<HTMLDivElement | null>,
  kbState: KBCarryState,
  setKbState: React.Dispatch<React.SetStateAction<KBCarryState>>,
  kbCarryRefs: RefObject<KBCarryRefs>,
  startCardFlight: (args: StartCardFlightArgs) => void,
  foundationCards: Array<Card | null>,
  tableauCards: Array<Array<{ card: Card; faceDown: boolean }>>,
  freeCellCards: Array<Card | null>,
  legalMoves: Move[],
  dispatch: AppDispatch,
  uid: string | null
) => {
  e.preventDefault();

  const { carrying } = kbState;
  const { carriedEl, dropTargetEl } = kbCarryRefs.current!;

  const getFlightStack = (
    source: ReturnType<typeof resolveBoardSourceFromEl> | null,
    tableauCards: Array<Array<{ card: Card; faceDown: boolean }>>,
    freeCellCards: Array<Card | null>,
    foundationCards: Array<Card | null>
  ): Card[] => {
    if (!source) return [];

    if (source.type === "tableau") {
      const column = tableauCards[source.index];
      return column.slice(source.startIndex).map((c) => c.card);
    } else if (source.type === "freecell") {
      const card = freeCellCards[source.index];
      return card ? [card] : [];
    } else if (source.type === "foundation") {
      const card = foundationCards[source.index];
      return card ? [card] : [];
    }

    return [];
  };

  if (carrying && carriedEl) {
    // check if legal move
    const source = resolveBoardSourceFromEl(carriedEl);
    const flightStack = getFlightStack(
      source,
      tableauCards,
      freeCellCards,
      foundationCards
    );
    const move = dropTargetEl
      ? resolveMoveAttempt({
          source,
          stackLength: flightStack.length,
          dropPileRef: getPileRefFromElement(dropTargetEl),
          legalMoves
        })
      : false;

    if (move) {
      const movedCardId = carriedEl?.dataset.cardId ?? null;
      const flightToEl =
        move.to.type === "tableau"
          ? (findTableauTailAnchorEl(boardRef.current, move.to.index) ??
            dropTargetEl!)
          : dropTargetEl!;

      // apply the move
      dispatch(applyMoveThunk({ move, uid }));

      // cards fly
      startCardFlight({
        fromEl: carriedEl,
        toEl: flightToEl,
        stack: flightStack,
        dropTarget: {
          type: move.to.type,
          index: move.to.index
        }
      });

      // focus the moved card in its new position after the board re-renders
      requestAnimationFrame(() => {
        if (!movedCardId || !boardRef.current) return;

        const movedCardEl = boardRef.current.querySelector<HTMLElement>(
          `[data-card-id="${movedCardId}"]`
        );

        movedCardEl?.focus({ preventScroll: true });
      });
    } else {
      requestAnimationFrame(() => {
        // focus back on original card if move was not successful
        carriedEl?.focus({ preventScroll: true });
      });
    }

    stopKbCarrying(boardRef.current, kbCarryRefs, setKbState);
  } else {
    const activeEl = document.activeElement as HTMLElement | null;
    if (!activeEl || !activeEl.classList.contains("is-playable")) return;

    startKbCarrying(boardRef.current, activeEl, kbCarryRefs, setKbState);
  }
  return;
};
