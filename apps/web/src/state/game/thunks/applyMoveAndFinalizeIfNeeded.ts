import type { Move } from "@vcell/engine";
import { getOrCreateDeviceId } from "@/persistence/schema";
import {
  applyMoveToHistory,
  selectCursor,
  selectHistory,
  selectMoves,
  selectSeed,
  selectStatus,
  selectUndosUsed,
  selectUndoLimit,
  setStatus
} from "@/state/game/gameSlice";
import {
  selectSessionId,
  selectStartedAtMs,
  selectTimeElapsedMs,
  setCheckpoint,
  setEndedAtMs,
  setStartedAtMs
} from "@/state/session/sessionSlice";
import { archiveCompletedGame } from "@/state/records/thunks/archiveCompletedGame";
import { computePostMoveResult } from "@/state/game/utils";
import { RootState, AppDispatch } from "@/state/reduxStore";
import { ThunkAction, UnknownAction } from "@reduxjs/toolkit";

type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  undefined,
  UnknownAction
>;

type Params = {
  move: Move;
  uid: string | null;
};

export function applyMoveAndFinalizeIfNeeded({ move, uid }: Params): AppThunk {
  return (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();

    const sessionId = selectSessionId(state);
    const startedAtMs = selectStartedAtMs(state);
    const timeElapsedMs = selectTimeElapsedMs(state);

    const seed = selectSeed(state);
    const moves = selectMoves(state);
    const cursor = selectCursor(state);
    const undosUsed = selectUndosUsed(state);
    const status = selectStatus(state);
    const history = selectHistory(state);
    const undoLimit = selectUndoLimit(state);

    // Ignore moves once a game has been abandoned.
    if (status === "abandoned") return;

    // First move starts the timer clock.
    if (startedAtMs == null) {
      dispatch(setStartedAtMs(Date.now()));
    }

    let resolved: ReturnType<typeof computePostMoveResult>;
    try {
      resolved = computePostMoveResult({
        moveToApply: move,
        currentCursor: cursor,
        currentMoves: moves,
        currentStatus: status,
        currentPresent: history.present
      });
    } catch (err) {
      console.warn("[makeMove] applyMove rejected move; dropping move", {
        err,
        move,
        sessionId,
        seed,
        cursor
      });
      return;
    }

    const { next, nextMoves, nextCursor, didWin, shouldCheckpoint } = resolved;

    const endedAtMs = didWin ? Date.now() : null;

    if (status !== "won") {
      dispatch(setEndedAtMs(null));
      dispatch(setStatus("in_progress"));
    }

    if (didWin) {
      if (endedAtMs != null) {
        dispatch(setEndedAtMs(endedAtMs));
      }

      dispatch(setStatus("won"));

      dispatch(
        archiveCompletedGame({
          sessionId,
          deviceId: getOrCreateDeviceId(),
          seed,
          rules: next.rules,
          finalStatus: "won",
          cursor: nextCursor,
          moves: nextMoves,
          startedAtMs,
          endedAtMs: endedAtMs ?? Date.now(),
          timeElapsedMs,
          undosUsed,
          uid
        })
      );
    }

    if (shouldCheckpoint) {
      dispatch(setCheckpoint({ at: nextCursor, state: next }));
    }

    dispatch(
      applyMoveToHistory({
        move,
        undoLimit,
        isWon: status === "won"
      })
    );
  };
}
