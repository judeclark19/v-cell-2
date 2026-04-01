import { useDispatch, useSelector } from "react-redux";
import { useKeyboardControlSystem } from "./keyboard-control/useKeyboardControlSystem";
import { usePointerControlSystem } from "./pointer-control/usePointerControlSystem_new";
import {
  selectFoundationCards,
  selectFreeCellCards,
  selectLegalMoves,
  selectTableauCards
} from "@/state/game/gameSlice";
import { selectUid } from "@/state/auth/authSlice";
import { AppDispatch } from "@/state/reduxStore";
import { useCallback } from "react";
import { useGameModel } from "@/state/game/hooks/useGameModel_new";
import { useCardFlight } from "./useCardFlight";
import { useTryAutoFoundation } from "./useTryAutoFoundation";
import { Card, Move } from "@vcell/engine";
import { useTryAutoFreeCell } from "./useTryAutoFreeCell";

export type BoardSource =
  | { type: "foundation"; index: number }
  | { type: "tableau"; index: number; startIndex: number }
  | { type: "freecell"; index: number };

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

  // Hooks ============================================================
  const { cardFlight, startCardFlight, clearCardFlight } = useCardFlight();

  const { tryAutoFreeCell } = useTryAutoFreeCell({
    legalMoves,
    startCardFlight,
    getCardForSingleMove,
    dispatch,
    uid
  });

  const { tryAutoFoundation } = useTryAutoFoundation({
    legalMoves,
    uid,
    dispatch,
    startCardFlight,
    getCardForSingleMove
  });

  const gameModel = useGameModel();

  const keyboard = useKeyboardControlSystem({
    boardRef,
    foundationCards,
    tableauCards,
    freeCellCards,
    legalMoves,
    tryAutoFreeCell,
    tryAutoFoundation,
    startCardFlight,
    newDeal: gameModel.newDeal,
    restart: gameModel.restart
  });

  const pointer = usePointerControlSystem({
    onCardDoubleTap: tryAutoFoundation
  });

  return {
    ...keyboard,
    ...pointer,
    ...gameModel,
    cardFlight,
    startCardFlight,
    clearCardFlight,
    tryAutoFoundation,
    tryAutoFreeCell
  };
}
