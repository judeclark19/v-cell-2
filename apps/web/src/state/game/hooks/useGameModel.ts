/* 
	•	read the Redux-backed game/session state you want UI to use
	•	expose domain actions the UI can call
	•	internally delegate to old hooks/thunks for now
	•	gradually absorb more ownership over time
    
    TODO: undo, restart, newDeal, startBySeed
    */

import { useCallback } from "react";
import type { Move } from "@vcell/engine";
import { useDispatch, useSelector } from "react-redux";
import { useSession } from "@/auth/AuthProvider";
import { AppDispatch } from "@/state/reduxStore";
import { applyMoveAndFinalizeIfNeeded } from "../thunks/applyMoveAndFinalizeIfNeeded";
import {
  undoHistory,
  selectUndosUsed,
  selectStatus,
  selectHistory,
  selectUndoLimit
} from "@/state/game/gameSlice";

export type UseGameModelResult = {
  makeMove: (move: Move) => void;
  undo: () => void;
};

export function useGameModel(): UseGameModelResult {
  const { uid } = useSession();
  const dispatch = useDispatch<AppDispatch>();
  const undosUsed = useSelector(selectUndosUsed);
  const status = useSelector(selectStatus);
  const history = useSelector(selectHistory);
  const undoLimit = useSelector(selectUndoLimit);

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

  return { makeMove, undo };
}
