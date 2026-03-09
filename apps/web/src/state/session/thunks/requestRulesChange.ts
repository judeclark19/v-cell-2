import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AppDispatch, RootState } from "@/state/reduxStore";
import type { Rules } from "@vcell/engine";
import { areRulesEqual } from "@/state/game/utils";
import { requestConfirmation } from "@/state/ui/requestConfirmation";
import { applyRulesChangeStartNewDeal } from "./applyRulesChange_startNewDeal";

export const requestRulesChange = createAsyncThunk<
  { kind: "noop" | "cancelled" | "started" },
  { patch: Rules; uid: string | null },
  { state: RootState; dispatch: AppDispatch }
>("session/requestRulesChange", async ({ patch, uid }, thunkApi) => {
  const state = thunkApi.getState();
  const dispatch = thunkApi.dispatch;

  const rules = state.game.rules;
  const startedAtMs = state.session.startedAtMs;
  const status = state.game.status;

  const newRules = { ...rules, ...patch };
  if (areRulesEqual(rules, newRules)) {
    return { kind: "noop" };
  }

  const ok =
    !(startedAtMs && status === "in_progress") ||
    (await requestConfirmation(dispatch, {
      title: "Change gameplay setting?",
      bodyText:
        "Changing this will start a new game and abandon your current one.",
      confirmLabel: "Change",
      cancelLabel: "Cancel"
    }));

  if (!ok) {
    return { kind: "cancelled" };
  }

  await dispatch(
    applyRulesChangeStartNewDeal({
      newRules,
      uid
    })
  );

  return { kind: "started" };
});
