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
  restartCurrentGame
} from "@/state/game/gameSlice";
import { setEndedAtMs, setCheckpoint } from "@/state/session/sessionSlice";
import { applyMoveThunk } from "../thunks/applyMove";
import { selectUid } from "@/state/auth/authSlice";
import { transitionGameAndSession } from "@/state/transitionGameAndSession";

export type UseGameModelResult = {
  makeMove: (move: Move) => void;
  undo: () => void;
  restart: () => void;
  restartDeal: () => void;
  newDeal: () => void;
  startBySeed: (seed: string) => void;
};

export function useGameModel(): UseGameModelResult {
  const dispatch = useDispatch<AppDispatch>();

  // Auth state
  const uid = useSelector(selectUid);

  // Game state
  const status = useSelector(selectStatus);
  const seed = useSelector(selectSeed);
  const history = useSelector(selectHistory);
  const undoLimit = useSelector(selectUndoLimit);
  const undosUsed = useSelector(selectUndosUsed);
  const rules = useSelector(selectRules);

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
    dispatch(transitionGameAndSession({}));
  }, [dispatch]);

  const startBySeed = useCallback(
    (seed: string) => {
      dispatch(transitionGameAndSession({ seed }));
    },
    [dispatch]
  );

  return {
    makeMove,
    undo,
    restart: restartDeleteMe,
    restartDeal,
    newDeal,
    startBySeed
  };
}
