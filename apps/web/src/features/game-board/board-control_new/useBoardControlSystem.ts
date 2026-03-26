import { useDispatch, useSelector } from "react-redux";
import { useKeyboardControlSystem } from "./keyboard-control/useKeyboardControlSystem";
import { usePointerControlSystem } from "./pointer-control/usePointerControlSystem_new";
import {
  selectIsAutoCompleting,
  selectLegalMoves,
  selectStatus,
  setIsAutoCompleting
} from "@/state/game/gameSlice";
import { selectUid } from "@/state/auth/authSlice";
import { applyMoveThunk } from "@/state/game/thunks/applyMove";
import { AppDispatch } from "@/state/reduxStore";
import { useCallback, useState } from "react";
import { useGameModel } from "@/state/game/hooks/useGameModel";
import { selectPaused } from "@/state/session/sessionSlice";
import { selectIsAnyModalOpen } from "@/state/ui/uiSlice";

export type BoardSource =
  | { type: "foundation"; index: number }
  | { type: "tableau"; index: number; startIndex: number }
  | { type: "freecell"; index: number };

type CardFlightDropTarget =
  | { type: "foundation"; index: number }
  | { type: "tableau"; index: number }
  | { type: "freecell"; index: number };

type CardFlightState = {
  active: boolean;
  cardIds: string[];
  dropTarget: CardFlightDropTarget | null;
  durationMs?: number;
};

export function useBoardControlSystem(
  boardRef: React.RefObject<HTMLDivElement | null>
) {
  const dispatch = useDispatch<AppDispatch>();
  // auth slice
  const uid = useSelector(selectUid);

  // session slice
  const paused = useSelector(selectPaused);

  // game slice
  const legalMoves = useSelector(selectLegalMoves);
  const isAutoCompleting = useSelector(selectIsAutoCompleting);
  const status = useSelector(selectStatus);

  // ui slice
  const isAnyModalOpen = useSelector(selectIsAnyModalOpen);

  const [cardFlight, setCardFlight] = useState<CardFlightState>({
    active: false,
    cardIds: [],
    dropTarget: null
  });

  const startCardFlight = useCallback(
    (args: { cardIds: string[]; dropTarget: CardFlightDropTarget }) => {
      setCardFlight({
        active: true,
        cardIds: args.cardIds,
        dropTarget: args.dropTarget
      });
    },
    []
  );

  const clearCardFlight = useCallback(() => {
    setCardFlight({
      active: false,
      cardIds: [],
      dropTarget: null
    });
  }, []);

  const resolveBoardSourceFromEl = (el: HTMLElement): BoardSource | null => {
    const region = el.dataset.region;
    const indexRaw = el.dataset.regionIndex;

    if (!region || indexRaw == null) return null;

    const index = Number(indexRaw);
    if (Number.isNaN(index)) return null;

    if (region === "tableau") {
      const startIndexRaw = el.dataset.positionInStack;
      if (startIndexRaw == null) return null;

      const startIndex = Number(startIndexRaw);
      if (Number.isNaN(startIndex)) return null;

      return { type: "tableau", index, startIndex };
    }

    if (region === "freecell") {
      return { type: "freecell", index };
    }

    if (region === "foundation") {
      return { type: "foundation", index };
    }

    return null;
  };

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
    [dispatch, startCardFlight, legalMoves, uid, clearCardFlight]
  );

  const tryAutoFreeCell = useCallback(
    (el: HTMLElement) => {
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

  const runAutoComplete = useCallback(async () => {
    // Don’t start if we’re already running or if UI/game state blocks it.
    if (isAutoCompleting) return;
    if (paused) return;
    if (isAnyModalOpen) return;
    if (status !== "won") return;

    dispatch(setIsAutoCompleting(true));

    try {
      while (true) {
        // TODO: implement this
        // 1. collect candidate source elements
        // 2. try foundation moves in preferred order
        // 3. if no move happened, break
        // 4. await one animation/frame boundary
      }
    } finally {
      dispatch(setIsAutoCompleting(false));
    }
  }, [isAutoCompleting, paused, isAnyModalOpen, status, dispatch]);

  // Hooks
  const keyboard = useKeyboardControlSystem({
    boardRef,
    clearCardFlight
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
    tryAutoFreeCell,
    runAutoComplete
  };
}
