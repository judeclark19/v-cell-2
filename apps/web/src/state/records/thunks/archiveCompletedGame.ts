import { createAsyncThunk } from "@reduxjs/toolkit";
import type { Move, Rules } from "@vcell/engine";
import {
  upsertCompletedGame
} from "@/persistence/completedGamesStore";
import { deleteInProgressGameForDevice } from "@/persistence/inProgressGamesStore";
import type { AppDispatch, RootState } from "@/state/reduxStore";
import { buildCompletedGameRecord } from "@/state/records/utils";
import {
  selectCompletedGames,
  setCompletedGames
} from "@/state/records/recordsSlice";
import {
  markPersistedGamePendingSync,
  syncGameToCloud
} from "@/persistence/cloudSync";

export const archiveCompletedGame = createAsyncThunk<
  void,
  {
    sessionId: string;
    deviceId: string;
    seed: string;
    rules: Rules;
    finalStatus: "won" | "abandoned";
    cursor: number;
    moves: Move[];
    startedAtMs: number | null;
    endedAtMs: number;
    timeElapsedMs: number;
    undosUsed: number;
    uid: string | null;
  },
  { state: RootState; dispatch: AppDispatch }
>("records/archiveCompletedGame", async (args, thunkApi) => {
  const completed = buildCompletedGameRecord({
    sessionId: args.sessionId,
    deviceId: args.deviceId,
    seed: args.seed,
    rules: args.rules,
    finalStatus: args.finalStatus,
    cursor: args.cursor,
    moves: args.moves,
    startedAtMs: args.startedAtMs,
    endedAtMs: args.endedAtMs,
    timeElapsedMs: args.timeElapsedMs,
    undosUsed: args.undosUsed,
    uid: args.uid
  });

  const completedGames = selectCompletedGames(thunkApi.getState());
  if (completedGames.some((g) => g.sessionId === completed.sessionId)) {
    return;
  }

  const localCompleted = args.uid
    ? markPersistedGamePendingSync(completed)
    : completed;

  thunkApi.dispatch(setCompletedGames([...completedGames, localCompleted]));

  await upsertCompletedGame(localCompleted);
  await deleteInProgressGameForDevice(args.deviceId).catch(() => {});

  await syncGameToCloud({
    uid: args.uid,
    game: localCompleted,
    upsertLocal: upsertCompletedGame
  }).catch((err) => {
    console.warn("[records] failed to sync completed game", err);
  });
});
