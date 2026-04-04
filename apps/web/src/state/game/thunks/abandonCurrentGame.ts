import { getOrCreateDeviceId } from "@/persistence/schema";
import { archiveCompletedGame } from "@/state/records/thunks/archiveCompletedGame";
import {
  selectStartedAtMs,
  selectEndedAtMs,
  selectTimeElapsedMs,
  selectSessionId,
  setEndedAtMs
} from "@/state/session/sessionSlice";
import {
  selectCursor,
  selectMoves,
  selectRules,
  selectUndosUsed,
  selectStatus,
  selectSeed,
  setStatus
} from "@/state/game/gameSlice";
import { AppDispatch, RootState } from "@/state/reduxStore";
import { ThunkAction, UnknownAction } from "@reduxjs/toolkit";

type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  undefined,
  UnknownAction
>;

type Params = {
  uid: string | null;
};

export function abandonCurrentGame({ uid }: Params): AppThunk {
  return (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    const status = selectStatus(state);
    const endedAtMs = selectEndedAtMs(state);
    const startedAtMs = selectStartedAtMs(state);
    const isFinished =
      status === "won" || status === "abandoned" || endedAtMs != null;

    if (!startedAtMs || isFinished) return;

    const sessionId = selectSessionId(state);
    const timeElapsedMs = selectTimeElapsedMs(state);
    const seed = selectSeed(state);
    const moves = selectMoves(state);
    const cursor = selectCursor(state);
    const undosUsed = selectUndosUsed(state);
    const rules = selectRules(state);

    dispatch(setStatus("abandoned"));

    const endedAtMsNow = Date.now();
    dispatch(setEndedAtMs(endedAtMsNow));

    dispatch(
      archiveCompletedGame({
        sessionId,
        deviceId: getOrCreateDeviceId(),
        seed,
        rules,
        finalStatus: "abandoned",
        cursor,
        moves,
        startedAtMs,
        endedAtMs: endedAtMsNow,
        timeElapsedMs,
        undosUsed,
        uid
      })
    );
  };
}
