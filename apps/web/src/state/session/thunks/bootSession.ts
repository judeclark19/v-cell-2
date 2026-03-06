import { createAsyncThunk } from "@reduxjs/toolkit";
import { Rules } from "@vcell/engine";

import { getInProgressGameForDevice } from "@/persistence/inProgressGamesStore";
import { getOrCreateDeviceId } from "@/persistence/schema";

import { transitionSession } from "../transitionSession_new";
import type { RootState } from "@/state/reduxStore";
import { hydrateFromPersisted } from "@/state/game/gameSlice";
import { setPaused, setSessionPhase } from "../sessionSlice";

/**
 * Boot the session from local persistence.
 *
 * Domain note:
 * - Persistence lives here (reads IndexedDB via persistence helpers).
 * - Game store stays clean: reducers + actions only.
 */
export const bootSession = createAsyncThunk<
  { kind: "hydrated" | "fresh" },
  { rules: Rules },
  { state: RootState }
>("session/bootSession", async (args: { rules: Rules }, thunkApi) => {
  const { rules } = args;

  const deviceId = getOrCreateDeviceId();
  const saved = await getInProgressGameForDevice(deviceId);

  // If we have a saved in-progress game, hydrate it directly into READY.
  if (saved && saved.seed && saved.gameId) {
    thunkApi.dispatch(
      hydrateFromPersisted({
        gameId: saved.gameId,
        seed: saved.seed,
        rules: saved.rules,
        moves: saved.moves,
        cursor: saved.cursor,
        fallbackRules: rules,
        // Prefer the saved rules' undoLimit if present, otherwise use current rules.
        undoLimit: saved.rules.undoLimit
      })
    );
    thunkApi.dispatch(setSessionPhase("ready"));
    thunkApi.dispatch(setPaused(saved.paused ?? false));

    return { kind: "hydrated" as const };
  }

  // Otherwise start a fresh session and immediately mark READY.
  transitionSession(
    {
      seed: crypto.randomUUID(),
      gameId: crypto.randomUUID(),
      rules
    },
    {
      getState: thunkApi.getState,
      dispatch: thunkApi.dispatch
    }
  );

  thunkApi.dispatch(setSessionPhase("ready"));
  return { kind: "fresh" as const };
});
