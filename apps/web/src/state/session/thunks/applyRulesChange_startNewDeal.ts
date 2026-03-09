import { createAsyncThunk } from "@reduxjs/toolkit";
import type { Rules } from "@vcell/engine";

import { selectHistory } from "@/state/game/gameSlice";
import { RootState } from "@/state/reduxStore";
import { transitionSession } from "../transitionSession_new";
import { setSessionPhase } from "../sessionSlice";

function areRulesEqual(a: Rules, b: Rules): boolean {
  return (
    a.allowFoundationPullback === b.allowFoundationPullback &&
    a.undoLimit === b.undoLimit &&
    a.faceDownCount === b.faceDownCount
  );
}

/**
 * Session-domain thunk: when rules change, start a NEW deal (new seed/gameId).
 * UI can optionally require confirmation before proceeding.
 */
export const applyRulesChangeStartNewDeal = createAsyncThunk<
  { kind: "noop" | "cancelled" | "started" },
  { patch: Partial<Rules>; confirm?: () => Promise<boolean> },
  { state: RootState }
>(
  "session/applyRulesChangeStartNewDeal",
  async ({ patch, confirm }, thunkApi) => {
    const currentRules = selectHistory(thunkApi.getState()).present.rules;

    const nextRules: Rules = {
      ...currentRules,
      ...patch
    };

    if (areRulesEqual(currentRules, nextRules)) {
      return { kind: "noop" as const };
    }

    if (confirm) {
      console.debug("[rulesChange] waiting for confirm");

      const ok = await confirm();

      console.debug("[rulesChange] confirm resolved:", ok);

      if (!ok) return { kind: "cancelled" as const };
    }

    transitionSession(
      {
        seed: crypto.randomUUID(),
        gameId: crypto.randomUUID(),
        rules: nextRules
      },
      {
        getState: thunkApi.getState,
        dispatch: thunkApi.dispatch
      }
    );

    thunkApi.dispatch(setSessionPhase("ready"));
    return { kind: "started" as const };
  }
);
