import { createAsyncThunk } from "@reduxjs/toolkit";
import { Rules } from "@vcell/engine";

import { getCompletedGameBySessionId } from "@/persistence/completedGamesStore";
import {
  deleteInProgressGameForDevice,
  getInProgressGameForDevice
} from "@/persistence/inProgressGamesStore";
import { isCompletedStatus } from "@/persistence/reconciliation";
import { getOrCreateDeviceId } from "@/persistence/schema";

import { transitionGameAndSession } from "../../transitionGameAndSession";
import type { RootState } from "@/state/reduxStore";
import { hydrateFromPersisted } from "@/state/game/gameSlice";
import {
  setEndedAtMs,
  setSessionId,
  setPaused,
  setSessionPhase,
  setStartedAtMs,
  setTimeElapsedMs
} from "../sessionSlice";

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

  if (saved?.sessionId) {
    const isBootPlaceholder =
      saved.seed === "seed-boot" ||
      saved.sessionId === "game-boot" ||
      saved.sessionId === "session-boot";
    const completed = await getCompletedGameBySessionId(saved.sessionId);
    if (
      isBootPlaceholder ||
      isCompletedStatus(saved.status) ||
      (completed && isCompletedStatus(completed.status))
    ) {
      await deleteInProgressGameForDevice(deviceId).catch(() => {});
    } else if (saved.seed) {
      // If we have a saved in-progress game, hydrate it directly into READY.
      thunkApi.dispatch(
        hydrateFromPersisted({
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
      thunkApi.dispatch(setStartedAtMs(saved.startedAtMs ?? null));
      thunkApi.dispatch(setEndedAtMs(saved.endedAtMs ?? null));
      thunkApi.dispatch(setSessionId(saved.sessionId));
      thunkApi.dispatch(setTimeElapsedMs(saved.timeElapsedMs ?? 0));

      return { kind: "hydrated" as const };
    }
  }

  // Otherwise start a fresh session and immediately mark READY.

  await thunkApi.dispatch(
    transitionGameAndSession({
      seed: crypto.randomUUID(),
      rules
    })
  );

  thunkApi.dispatch(setSessionPhase("ready"));
  return { kind: "fresh" as const };
});
