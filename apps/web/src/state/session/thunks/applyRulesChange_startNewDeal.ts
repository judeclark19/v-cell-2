import { createAsyncThunk } from "@reduxjs/toolkit";
import type { Rules } from "@vcell/engine";
import { AppDispatch, RootState } from "@/state/reduxStore";
import { transitionGameAndSession } from "../../transitionGameAndSession";
import { getOrCreateDeviceId } from "@/persistence/schema";
import { deleteInProgressGameForDevice } from "@/persistence/inProgressGamesStore";
import { abandonCurrentGameIfNeeded } from "@/state/game/thunks/abandonCurrentGameIfNeeded";

export const applyRulesChangeStartNewDeal = createAsyncThunk<
  { kind: "noop" | "cancelled" | "started" },
  { newRules: Rules; uid: string | null },
  { state: RootState }
>(
  "session/applyRulesChangeStartNewDeal",
  async ({ newRules, uid }, thunkApi) => {
    const dispatch = thunkApi.dispatch as AppDispatch;

    dispatch(abandonCurrentGameIfNeeded({ uid }));

    const deviceId = getOrCreateDeviceId();
    deleteInProgressGameForDevice(deviceId).catch(() => {});

    dispatch(
      transitionGameAndSession({
        rules: newRules
      })
    );

    return { kind: "started" as const };
  }
);
