import { createAsyncThunk } from "@reduxjs/toolkit";
import { Rules } from "@vcell/engine";
import { RootState } from "../reduxStore";
import { startNewGame } from "../game/gameSlice";
import { startNewSession } from "./sessionSlice";

type Params = {
  seed?: string;
  rules: Rules;
};

export const transitionSession = createAsyncThunk<
  { kind: "noop" | "started" },
  Params,
  { state: RootState }
>("session/transitionSession", async ({ seed, rules }, thunkApi) => {
  const dispatch = thunkApi.dispatch;

  dispatch(
    startNewGame({
      seed,
      rules
    })
  );
  dispatch(startNewSession());
  return {
    kind: "started" as const
  };
});
