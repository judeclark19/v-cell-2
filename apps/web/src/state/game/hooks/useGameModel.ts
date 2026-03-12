/* 
	•	read the Redux-backed game/session state you want UI to use
	•	expose domain actions the UI can call
	•	internally delegate to old hooks/thunks for now
	•	gradually absorb more ownership over time
    
    TODO: undo, restart, newDeal, startBySeed
    */

import { useCallback } from "react";
import type { Move } from "@vcell/engine";
import { useDispatch } from "react-redux";
import { useSession } from "@/auth/AuthProvider";
import { AppDispatch } from "@/state/reduxStore";
import { applyMoveAndFinalizeIfNeeded } from "../thunks/applyMoveAndFinalizeIfNeeded";

export type UseGameModelResult = {
  makeMove: (move: Move) => void;
};

export function useGameModel(): UseGameModelResult {
  const { uid } = useSession();
  const dispatch = useDispatch<AppDispatch>();

  const makeMove = useCallback(
    (move: Move) => {
      dispatch(applyMoveAndFinalizeIfNeeded({ move, uid }));
    },
    [dispatch, uid]
  );

  return { makeMove };
}
