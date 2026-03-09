// apps/web/src/state/session/thunks/ensureSessionStarted.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import type { RootState } from "@/state/reduxStore";
import { transitionSession } from "../transitionSession_new";
import { Rules } from "@vcell/engine";

type Args = {
  seed: string;
  sessionId: string;
  rules: Rules;
};

export const ensureSessionStarted = createAsyncThunk<
  void,
  Args,
  { state: RootState }
>("session/ensureSessionStarted", async ({ rules }, { dispatch }) => {
  // const res = await transitionSession(
  //   { seed, sessionId, rules },
  //   { getState, dispatch }
  // );

  // if (res.kind === "noop") {
  //   return { kind: "noop", reason: res.reason };
  // }

  // return { kind: "started" };

  await dispatch(
    transitionSession({
      seed: crypto.randomUUID(),
      rules
    })
  );
});
