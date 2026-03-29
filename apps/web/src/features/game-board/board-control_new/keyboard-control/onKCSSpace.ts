import { Card, Move } from "@vcell/engine";
import {
  getPileRefFromElement,
  resolveBoardSourceFromEl,
  resolveMoveAttempt
} from "../resolveMoveAttempt";
import { startKbCarrying, stopKbCarrying } from "./keyboardCarrying";
import { AppDispatch } from "@/state/reduxStore";
import { applyMoveThunk } from "@/state/game/thunks/applyMove";

export const onKCSSpace = (
  e: React.KeyboardEvent<HTMLDivElement>,
  boardRef: React.RefObject<HTMLDivElement | null>,
  kbCarrying: boolean,
  setKbCarrying: React.Dispatch<React.SetStateAction<boolean>>,
  kbCarriedElRef: React.RefObject<HTMLElement | null>,
  tableauCards: Array<Array<{ card: Card; faceDown: boolean }>>,
  kbDropTargetElRef: React.RefObject<HTMLElement | null>,
  legalMoves: Move[],
  dispatch: AppDispatch,
  uid: string | null
) => {
  e.preventDefault();

  if (kbCarrying) {
    // check if legal move
    const source = resolveBoardSourceFromEl(kbCarriedElRef.current!);
    const move = resolveMoveAttempt({
      source,
      stackLength:
        source?.type === "tableau"
          ? tableauCards[source.index]?.length - source.startIndex
          : source
            ? 1
            : 0,
      dropPileRef: getPileRefFromElement(kbDropTargetElRef.current!),
      legalMoves
    });

    if (move) {
      const movedCardId = kbCarriedElRef.current?.dataset.cardId ?? null;

      // apply the move
      dispatch(applyMoveThunk({ move, uid }));

      // focus the moved card in its new position after the board re-renders
      requestAnimationFrame(() => {
        if (!movedCardId || !boardRef.current) return;

        const movedCardEl = boardRef.current.querySelector<HTMLElement>(
          `[data-card-id="${movedCardId}"]`
        );

        movedCardEl?.focus({ preventScroll: true });
      });
    } else {
      const carriedCardEl = kbCarriedElRef.current;

      requestAnimationFrame(() => {
        // focus back on original card if move was not successful
        carriedCardEl?.focus({ preventScroll: true });
      });
    }

    stopKbCarrying(
      boardRef.current,
      kbCarriedElRef,
      kbDropTargetElRef,
      setKbCarrying
    );
  } else {
    const activeEl = document.activeElement as HTMLElement | null;
    if (!activeEl) return;

    startKbCarrying(boardRef.current, activeEl, kbCarriedElRef, setKbCarrying);
  }
  return;
};
