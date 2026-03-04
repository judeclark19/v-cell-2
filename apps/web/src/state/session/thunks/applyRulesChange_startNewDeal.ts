import { createAsyncThunk } from "@reduxjs/toolkit";
import type { Rules } from "@vcell/engine";

import {
  finalizeHydration,
  RootState,
  selectHistory,
  startSession
} from "@/state/game";

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
      const ok = await confirm();
      if (!ok) return { kind: "cancelled" as const };
    }

    thunkApi.dispatch(startSession({ rules: nextRules }));
    thunkApi.dispatch(finalizeHydration());
    return { kind: "started" as const };
  }
);
