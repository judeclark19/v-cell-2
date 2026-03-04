// apps/web/src/state/session/thunks/ensureSessionStarted.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import type { RootState } from "@/state/reduxStore";
import { transitionSession } from "../transitionSession_new";
import { Rules } from "@vcell/engine";

type Args = {
  seed: string;
  gameId: string;
  rules: Rules;
};

type Result = { kind: "noop"; reason: string } | { kind: "started" };

export const ensureSessionStarted = createAsyncThunk<
  Result,
  Args,
  { state: RootState }
>(
  "session/ensureSessionStarted",
  async ({ seed, gameId, rules }, { getState, dispatch }) => {
    const res = await transitionSession(
      { seed, gameId, rules },
      { getState, dispatch }
    );

    if (res.kind === "noop") {
      return { kind: "noop", reason: res.reason };
    }

    return { kind: "started" };
  }
);
