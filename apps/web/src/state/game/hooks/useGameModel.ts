/* 
	•	read the Redux-backed game/session state you want UI to use
	•	expose domain actions the UI can call
	•	internally delegate to old hooks/thunks for now
	•	gradually absorb more ownership over time
    
    TODO: restart, newDeal, startBySeed
    */
import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

import { createGame } from "@vcell/engine";
import type { Move } from "@vcell/engine";

import { useSession } from "@/auth/AuthProvider";

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
  selectSeed
} from "@/state/game/gameSlice";
import { setEndedAtMs, setCheckpoint } from "@/state/session/sessionSlice";
import { applyMoveAndFinalizeIfNeeded } from "../thunks/applyMoveAndFinalizeIfNeeded";

export type UseGameModelResult = {
  makeMove: (move: Move) => void;
  undo: () => void;
  restart: () => void;
};

export function useGameModel(): UseGameModelResult {
  const { uid } = useSession();
  const dispatch = useDispatch<AppDispatch>();

  // Game state
  const status = useSelector(selectStatus);
  const seed = useSelector(selectSeed);
  const history = useSelector(selectHistory);
  const undoLimit = useSelector(selectUndoLimit);
  const undosUsed = useSelector(selectUndosUsed);
  const rules = useSelector(selectRules);

  const makeMove = useCallback(
    (move: Move) => {
      dispatch(applyMoveAndFinalizeIfNeeded({ move, uid }));
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
    // Restart should reset the deal back to its original position and clear history,
    // but it should NOT affect the timer.
    dispatch(hydrateHistory({ present: createGame(seed, rules), past: [] }));
    dispatch(resetTimeline());
    dispatch(setUndosUsed(0));
    dispatch(setCheckpoint(null));
    dispatch(setEndedAtMs(null));
    dispatch(setStatus("in_progress"));
  }, [seed, rules, dispatch]);

  return { makeMove, undo, restart };
}
