import { useDispatch, useSelector } from "react-redux";
import { useKeyboardControlSystem } from "./keyboard-control/useKeyboardControlSystem";
import { usePointerControlSystem } from "./pointer-control/usePointerControlSystem";
import {
  selectFoundationCards,
  selectFreeCellCards,
  selectLegalMoves,
  selectTableauCards
} from "@/state/game/gameSlice";
import { selectUid } from "@/state/auth/authSlice";
import { AppDispatch } from "@/state/reduxStore";
import { useCallback } from "react";
import { useGameModel } from "@/state/game/hooks/useGameModel";
import { DropTarget, useCardFlight } from "./useCardFlight";
import { useTryAutoFoundation } from "./useTryAutoFoundation";
import { Card, Move, PileRef } from "@vcell/engine";
import { useTryAutoFreeCell } from "./useTryAutoFreeCell";
import { applyMoveThunk } from "@/state/game/thunks/applyMove";

export type BoardSource =
  | { type: "foundation"; index: number }
  | { type: "tableau"; index: number; startIndex: number }
  | { type: "freecell"; index: number };

export type PerformMoveArgs = {
  move: Move;
  fromEl?: HTMLElement | null;
  toEl?: HTMLElement | null;
  stack?: Card[];
  dropTarget?: DropTarget;
  durationMs?: number;
};

export function useBoardControlSystem(
  boardRef: React.RefObject<HTMLDivElement | null>
) {
  const dispatch = useDispatch<AppDispatch>();
  // auth slice
  const uid = useSelector(selectUid);

  // game slice
  const legalMoves = useSelector(selectLegalMoves);
  const foundationCards = useSelector(selectFoundationCards);
  const tableauCards = useSelector(selectTableauCards);
  const freeCellCards = useSelector(selectFreeCellCards);

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

  const getElFromPileRef = useCallback(
    (pileRef: PileRef): HTMLElement | null => {
      if (!boardRef.current) return null;
      const candidates = Array.from(
        boardRef.current.querySelectorAll<HTMLElement>(
          `[data-region="${pileRef.type}"][data-region-index="${pileRef.index}"].card-slot, ` +
            `[data-region="${pileRef.type}"][data-region-index="${pileRef.index}"].is-playable`
        )
      );

      if (!candidates || candidates.length === 0) return null;

      return candidates[candidates.length - 1];
    },
    [boardRef]
  );

  // Hooks ============================================================
  const { cardFlight, startCardFlight, clearCardFlight } = useCardFlight();
  const isCardFlightActive = cardFlight.active;

  const performMove = useCallback(
    ({
      move,
      fromEl,
      toEl,
      stack,
      dropTarget,
      durationMs
    }: PerformMoveArgs): boolean => {
      if (cardFlight.active) return false;

      if (fromEl && toEl && stack && stack.length > 0 && dropTarget) {
        startCardFlight({
          fromEl,
          toEl,
          stack,
          dropTarget,
          durationMs
        });
      }

      dispatch(applyMoveThunk({ move, uid }));
      return true;
    },
    [cardFlight.active, dispatch, startCardFlight, uid]
  );

  const { tryAutoFreeCell } = useTryAutoFreeCell({
    boardRef,
    legalMoves,
    getCardForSingleMove,
    performMove
  });

  const { tryAutoFoundation } = useTryAutoFoundation({
    boardRef,
    legalMoves,
    getCardForSingleMove,
    performMove
  });

  const gameModel = useGameModel(
    boardRef,
    cardFlight,
    startCardFlight,
    getCardForSingleMove,
    getElFromPileRef
  );

  const keyboard = useKeyboardControlSystem({
    boardRef,
    foundationCards,
    tableauCards,
    freeCellCards,
    legalMoves,
    tryAutoFreeCell,
    tryAutoFoundation,
    performMove,
    isCardFlightActive,
    newDeal: gameModel.newDeal,
    restart: gameModel.restart,
    undo: gameModel.undo
  });

  const pointer = usePointerControlSystem({
    boardRef,
    onCardDoubleTap: tryAutoFoundation,
    isCardFlightActive,
    performMove
  });

  return {
    ...keyboard,
    ...pointer,
    ...gameModel,
    cardFlight,
    startCardFlight,
    clearCardFlight,
    performMove,
    tryAutoFoundation,
    tryAutoFreeCell
  };
}
