/* 
new stuff!
    */
import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

import { createGame } from "@vcell/engine";
import type { Move } from "@vcell/engine";

import { AppDispatch } from "@/state/reduxStore";
import {
  undoHistory,
  selectUndosUsed,
  selectStatus,
  selectHistory,
  selectUndoLimit,
  hydrateHistory,
  resetTimeline,
  setUndosUsed,
  setStatus,
  selectRules,
  selectSeed,
  restartCurrentGame,
  selectIsAutoCompleting,
  setIsAutoCompleting
} from "@/state/game/gameSlice";
import {
  setEndedAtMs,
  setCheckpoint,
  selectPaused
} from "@/state/session/sessionSlice";
import { applyMoveThunk } from "../thunks/applyMove";
import { selectUid } from "@/state/auth/authSlice";
import { transitionGameAndSession } from "@/state/transitionGameAndSession";
import { newDealThunk } from "@/state/session/thunks/newDeal";
import { selectIsAnyModalOpen } from "@/state/ui/uiSlice";

export type UseGameModelResult = {
  makeMove: (move: Move) => void;
  undo: () => void;
  restart: () => void;
  restartDeal: () => void;
  newDeal: () => void;
  startBySeed: (seed: string) => void;
  runAutoComplete: () => void;
};

export function useGameModel(): UseGameModelResult {
  const dispatch = useDispatch<AppDispatch>();

  // Auth state
  const uid = useSelector(selectUid);

  // session slice
  const paused = useSelector(selectPaused);

  // Game slice
  const status = useSelector(selectStatus);
  const seed = useSelector(selectSeed);
  const history = useSelector(selectHistory);
  const undoLimit = useSelector(selectUndoLimit);
  const undosUsed = useSelector(selectUndosUsed);
  const rules = useSelector(selectRules);
  const isAutoCompleting = useSelector(selectIsAutoCompleting);

  // ui slice
  const isAnyModalOpen = useSelector(selectIsAnyModalOpen);

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

  const restartDeleteMe = useCallback(() => {
    // Restart should reset the deal back to its original position and clear history,
    // but it should NOT affect the timer.
    dispatch(hydrateHistory({ present: createGame(seed, rules), past: [] }));
    dispatch(resetTimeline());
    dispatch(setUndosUsed(0));
    dispatch(setCheckpoint(null));
    dispatch(setEndedAtMs(null));
    dispatch(setStatus("in_progress"));
  }, [seed, rules, dispatch]);
  // TODO: why is this called delete me lol

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
      dispatch(restartCurrentGame());
      return;
    }
  }, [dispatch, seed, rules, status]);

  const newDeal = useCallback(() => {
    dispatch(newDealThunk({ rules, uid }));
  }, [dispatch, rules, uid]);

  const startBySeed = useCallback(
    (seed: string) => {
      dispatch(transitionGameAndSession({ seed }));
    },
    [dispatch]
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

  return {
    makeMove,
    undo,
    restart: restartDeleteMe,
    restartDeal,
    newDeal,
    startBySeed,
    runAutoComplete
  };
}
