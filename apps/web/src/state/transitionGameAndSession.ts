import { createAsyncThunk } from "@reduxjs/toolkit";
import { Rules } from "@vcell/engine";
import { RootState } from "./reduxStore";
import { startNewGame } from "./game/gameSlice";
import { startNewSession } from "./session/sessionSlice";

type Params = {
  seed?: string;
  sessionId?: string;
  rules?: Rules;
};

export const transitionGameAndSession = createAsyncThunk<
  { kind: "noop" | "started" },
  Params,
  { state: RootState }
>(
  "session/transitionGameAndSession",
  async ({ seed, sessionId, rules }, thunkApi) => {
    const dispatch = thunkApi.dispatch;
    dispatch(
      startNewGame({
        seed,
        rules
      })
    );
    dispatch(startNewSession(sessionId));
    return {
      kind: "started" as const
    };
  }
);
