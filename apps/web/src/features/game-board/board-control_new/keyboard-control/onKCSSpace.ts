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

export const onKCSSpace = (
  e: React.KeyboardEvent<HTMLDivElement>,
  boardRef: React.RefObject<HTMLDivElement | null>,
  kbState: KBCarryState,
  setKbState: React.Dispatch<React.SetStateAction<KBCarryState>>,
  kbCarryRefs: RefObject<KBCarryRefs>,
  tableauCards: Array<Array<{ card: Card; faceDown: boolean }>>,
  legalMoves: Move[],
  dispatch: AppDispatch,
  uid: string | null
) => {
  e.preventDefault();

  const { carrying } = kbState;
  const { carriedEl, dropTargetEl } = kbCarryRefs.current!;

  if (carrying && carriedEl) {
    // check if legal move
    const source = resolveBoardSourceFromEl(carriedEl);
    const move = dropTargetEl
      ? resolveMoveAttempt({
          source,
          stackLength:
            source?.type === "tableau"
              ? tableauCards[source.index]?.length - source.startIndex
              : source
                ? 1
                : 0,
          dropPileRef: getPileRefFromElement(dropTargetEl),
          legalMoves
        })
      : false;

    if (move) {
      const movedCardId = carriedEl?.dataset.cardId ?? null;

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
