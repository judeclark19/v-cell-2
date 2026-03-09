import { createAsyncThunk } from "@reduxjs/toolkit";
import type { Rules } from "@vcell/engine";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { RootState } from "@/state/reduxStore";
import { transitionSession } from "../transitionSession_new";
import { setStatus } from "@/state/game/gameSlice";
import { setEndedAtMs } from "../sessionSlice";
import { PersistedGame } from "@/persistence/types";
import { getOrCreateDeviceId } from "@/persistence/schema";
import { setCompletedGames } from "@/state/records/recordsSlice";
import { deleteInProgressGameForDevice } from "@/persistence/inProgressGamesStore";

/**
 * Session-domain thunk: when rules change, start a NEW deal (new seed/sessionId).
 * UI can optionally require confirmation before proceeding.
 */
export const applyRulesChangeStartNewDeal = createAsyncThunk<
  { kind: "noop" | "cancelled" | "started" },
  { newRules: Rules; uid: string | null },
  { state: RootState }
>(
  "session/applyRulesChangeStartNewDeal",
  async ({ newRules, uid }, thunkApi) => {
    const now = Date.now();
    const state = thunkApi.getState();
    const dispatch = thunkApi.dispatch;

    const { sessionId, startedAtMs } = state.session;
    const { seed, history, cursor, moves, undosUsed } = state.game;
    const { completedGames } = state.records;

    // abandon current game
    dispatch(setStatus("abandoned"));
    dispatch(setEndedAtMs(now));

    // create a record
    const completed: PersistedGame = {
      sessionId,
      deviceId: getOrCreateDeviceId(),
      seed,
      rules: history.present.rules,
      kind: "freeplay",

      status: "abandoned",

      startedAtMs,
      endedAtMs: now,
      timeElapsedMs: 0,
      paused: false,

      moveCount: cursor,
      undosUsed,
      moves,
      cursor,

      updatedAtMs: now,
      ...(uid ? { userId: uid } : {})
    };
    if (completedGames.some((g) => g.sessionId === sessionId))
      return { kind: "noop" as const };

    dispatch(setCompletedGames([...completedGames, completed]));

    if (uid) {
      setDoc(doc(db, "users", uid, "games", sessionId), completed, {
        merge: true
      }).catch((err) => {
        console.warn(
          "[game actions] failed to write completed game to Firestore",
          err
        );
      });
    }

    const deviceId = getOrCreateDeviceId();
    deleteInProgressGameForDevice(deviceId).catch(() => {});

    dispatch(
      transitionSession({
        seed: crypto.randomUUID(),
        rules: newRules
      })
    );

    return { kind: "started" as const };
  }
);
