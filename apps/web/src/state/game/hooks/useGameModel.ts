/* 
new stuff!
    */
import { useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import { getAutoCompleteMoves } from "@vcell/engine";
import type { Card, Move, PileRef } from "@vcell/engine";

import { AppDispatch } from "@/state/reduxStore";
import {
  undoHistory,
  selectUndosUsed,
  selectStatus,
  selectHistory,
  selectUndoLimit,
  selectRules,
  selectSeed,
  restartCurrentGame,
  selectIsAutoCompleting,
  selectIsFullyCollected,
  setIsAutoCompleting
} from "@/state/game/gameSlice";
import { setCheckpoint } from "@/state/session/sessionSlice";
import { applyMoveThunk } from "../thunks/applyMove";
import { selectUid } from "@/state/auth/authSlice";
import { transitionGameAndSession } from "@/state/transitionGameAndSession";
import { newDealThunk } from "@/state/session/thunks/newDeal";
import {
  CardFlightState,
  StartCardFlightArgs
} from "@/features/game-board/board-control/useCardFlight";
import { openWinModal } from "@/state/ui/uiSlice";
import { throwConfetti } from "../utils";

export type UseGameModelResult = {
  makeMove: (move: Move) => void;
  undo: () => void;
  restart: () => void;
  restartDeal: () => void;
  newDeal: () => void;
  startBySeed: (seed: string) => void;
};

export function useGameModel(
  boardRef: React.RefObject<HTMLDivElement | null>,
  cardFlight: CardFlightState,
  startCardFlight: (args: StartCardFlightArgs) => void,
  getCardForSingleMove: (move: Move) => Card | null,
  getElFromPileRef: (pileRef: PileRef) => HTMLElement | null
): UseGameModelResult {
  const dispatch = useDispatch<AppDispatch>();

  // Auth state
  const uid = useSelector(selectUid);

  // Game slice
  const status = useSelector(selectStatus);
  const seed = useSelector(selectSeed);
  const history = useSelector(selectHistory);
  const undoLimit = useSelector(selectUndoLimit);
  const undosUsed = useSelector(selectUndosUsed);
  const rules = useSelector(selectRules);
  const isAutoCompleting = useSelector(selectIsAutoCompleting);
  const isFullyCollected = useSelector(selectIsFullyCollected);

  // Autocomplete effect
  const startAutoComplete = useCallback(() => {
    if (isAutoCompleting && isFullyCollected) {
      dispatch(setIsAutoCompleting(false));
      return;
    }
    if (isAutoCompleting && !cardFlight?.active) {
      const move = getAutoCompleteMoves(history.present)[0];

      if (move) {
        const fromEl = getElFromPileRef(move.from);
        const toEl = getElFromPileRef(move.to);
        const cardToMove = getCardForSingleMove(move);

        if (!fromEl || !toEl || !cardToMove) {
          dispatch(setIsAutoCompleting(false));
          return;
        }

        const toIndex = move.to.index;
        dispatch(applyMoveThunk({ move, uid }));
        startCardFlight({
          fromEl,
          toEl,
          stack: [cardToMove],
          dropTarget: { type: "foundation", index: toIndex },
          durationMs: 50
        });
      } else {
        dispatch(setIsAutoCompleting(false));
      }
    }
  }, [
    isAutoCompleting,
    isFullyCollected,
    cardFlight?.active,
    history.present,
    getElFromPileRef,
    getCardForSingleMove,
    dispatch,
    uid,
    startCardFlight
  ]);

  useEffect(() => {
    if (!isAutoCompleting) return;
    startAutoComplete();
  }, [isAutoCompleting, startAutoComplete]);

  // win celebration
  const confettiLoadedRef = useRef(false);
  useEffect(() => {
    if (status === "won" && isFullyCollected) {
      dispatch(openWinModal());
      if (confettiLoadedRef.current) {
        throwConfetti(boardRef.current!);
        confettiLoadedRef.current = false;
      }
    } else if (!confettiLoadedRef.current) {
      confettiLoadedRef.current = true;
    }
  }, [status, isFullyCollected, dispatch, boardRef]);

  const makeMove = useCallback(
    (move: Move) => {
      dispatch(applyMoveThunk({ move, uid }));
    },
    [dispatch, uid]
  );

  const undo = useCallback(() => {
    // If the game is not in progress, undo is disabled.
    if (status !== "in_progress") return;

    // Nothing to undo.
    if (history.past.length === 0) return;

    // Enforce undo limit.
    if (undoLimit !== "unlimited" && undosUsed >= undoLimit) return;

    dispatch(undoHistory());
  }, [status, history.past.length, undoLimit, undosUsed, dispatch]);

  const restart = useCallback(() => {
    dispatch(restartCurrentGame());
    dispatch(setCheckpoint(null));
  }, [dispatch]);

  const restartDeal = useCallback(() => {
    if (status === "won") {
      dispatch(
        transitionGameAndSession({
          seed,
          rules
        })
      );
      return;
    }

    if (status === "in_progress") {
      restart();
      return;
    }
  }, [dispatch, seed, rules, status, restart]);

  const newDeal = useCallback(() => {
    dispatch(newDealThunk({ rules, uid }));
  }, [dispatch, rules, uid]);

  const startBySeed = useCallback(
    (seed: string) => {
      dispatch(transitionGameAndSession({ seed }));
    },
    [dispatch]
  );

  return {
    makeMove,
    undo,
    restart,
    restartDeal,
    newDeal,
    startBySeed
  };
}
