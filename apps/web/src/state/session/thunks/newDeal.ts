import { createAsyncThunk } from "@reduxjs/toolkit";
import type { Rules } from "@vcell/engine";
import { AppDispatch, RootState } from "@/state/reduxStore";
import { transitionGameAndSession } from "../../transitionGameAndSession";
import { getOrCreateDeviceId } from "@/persistence/schema";
import { deleteInProgressGameForDevice } from "@/persistence/inProgressGamesStore";
import { abandonCurrentGame } from "@/state/game/thunks/abandonCurrentGame";

export const newDealThunk = createAsyncThunk<
  { kind: "noop" | "cancelled" | "started" },
  { rules?: Rules; uid: string | null },
  { state: RootState }
>("session/newDeal", async ({ rules, uid }, thunkApi) => {
  const dispatch = thunkApi.dispatch as AppDispatch;

  dispatch(abandonCurrentGame({ uid }));

  const deviceId = getOrCreateDeviceId();
  deleteInProgressGameForDevice(deviceId).catch(() => {});

  dispatch(
    transitionGameAndSession({
      rules
    })
  );

  return { kind: "started" as const };
});
