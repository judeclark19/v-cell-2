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
import { writeCompletedGameToCloud } from "@/persistence/utils";

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
  try {
    console.log("[archiveCompletedGame] start", {
      sessionId: args.sessionId,
      finalStatus: args.finalStatus,
      cursor: args.cursor,
      movesLength: args.moves.length,
      startedAtMs: args.startedAtMs,
      endedAtMs: args.endedAtMs,
      uid: args.uid
    });

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
    console.log("[archiveCompletedGame] built record", {
      sessionId: completed.sessionId,
      status: completed.status,
      cursor: completed.cursor,
      movesLength: completed.moves.length
    });

    const completedGames = selectCompletedGames(thunkApi.getState());
    const duplicate = completedGames.some(
      (g) => g.sessionId === completed.sessionId
    );
    console.log("[archiveCompletedGame] duplicate check", {
      sessionId: completed.sessionId,
      duplicate,
      existingCount: completedGames.length
    });

    if (duplicate) {
      console.warn("[archiveCompletedGame] duplicate sessionId; skipping write", {
        sessionId: completed.sessionId,
        finalStatus: completed.status,
        existingCount: completedGames.length
      });
      return;
    }

    thunkApi.dispatch(setCompletedGames([...completedGames, completed]));
    console.log("[archiveCompletedGame] dispatched records update", {
      sessionId: completed.sessionId
    });

    await upsertCompletedGame(completed);
    console.log("[archiveCompletedGame] wrote IndexedDB", {
      sessionId: completed.sessionId,
      status: completed.status,
      cursor: completed.cursor,
      movesLength: completed.moves.length
    });

    await deleteInProgressGameForDevice(args.deviceId).catch(() => {});
    console.log("[archiveCompletedGame] cleared local in-progress", {
      deviceId: args.deviceId
    });

    writeCompletedGameToCloud(args.uid, completed);
    console.log("[archiveCompletedGame] queued cloud write", {
      sessionId: completed.sessionId,
      status: completed.status
    });
  } catch (error) {
    console.error("[archiveCompletedGame] failed", error, {
      sessionId: args.sessionId,
      finalStatus: args.finalStatus,
      cursor: args.cursor,
      movesLength: args.moves.length,
      uid: args.uid
    });
    throw error;
  }
});
