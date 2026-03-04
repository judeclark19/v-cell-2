import { createAsyncThunk } from "@reduxjs/toolkit";
import { Rules } from "@vcell/engine";

import { getInProgressGameForDevice } from "@/persistence/inProgressGamesStore";
import { getOrCreateDeviceId } from "@/persistence/schema";

import {
  finalizeHydration,
  hydrateFromPersisted,
  startSession
} from "@/state/game/gameStore_new";

/**
 * Boot the session from local persistence.
 *
 * Domain note:
 * - Persistence lives here (reads IndexedDB via persistence helpers).
 * - Game store stays clean: reducers + actions only.
 */
export const bootSession = createAsyncThunk(
  "session/bootSession",
  async (args: { rules: Rules }, thunkApi) => {
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

      return { kind: "hydrated" as const };
    }

    // Otherwise start a fresh session and immediately mark READY.
    thunkApi.dispatch(startSession({ rules }));
    thunkApi.dispatch(finalizeHydration());
    return { kind: "fresh" as const };
  }
);
