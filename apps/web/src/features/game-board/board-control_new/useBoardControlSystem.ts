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
import { applyMoveThunk } from "@/state/game/thunks/applyMove";
import { AppDispatch } from "@/state/reduxStore";
import { useCallback } from "react";
import { useGameModel } from "@/state/game/hooks/useGameModel_new";
import { useCardFlight } from "./useCardFlight";
import { useTryAutoFoundation } from "./useTryAutoFoundation";
import { resolveBoardSourceFromEl } from "./resolveMoveAttempt";

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

      // 3. Commit the move.
      dispatch(applyMoveThunk({ move, uid }));

      // 4. Return whether a move was made.
      return true;
    },
    [dispatch, legalMoves, uid]
  );

  // Hooks ============================================================
  const { cardFlight, startCardFlight, clearCardFlight } = useCardFlight();

  const { tryAutoFoundation } = useTryAutoFoundation({
    legalMoves,
    uid,
    dispatch,
    startCardFlight,
    foundationCards,
    tableauCards,
    freeCellCards
  });

  const keyboard = useKeyboardControlSystem({
    boardRef,
    tableauCards,
    legalMoves,
    tryAutoFreeCell,
    tryAutoFoundation
  });

  const pointer = usePointerControlSystem({
    onCardDoubleTap: tryAutoFoundation
  });

  const gameModel = useGameModel();

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
