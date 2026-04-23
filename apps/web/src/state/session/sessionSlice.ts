import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { GameState } from "@vcell/engine";
import { safeRandomId } from "../utils";
import { RootState } from "../reduxStore";

export type SessionPhase = "boot" | "hydrating" | "ready";
export interface SessionStoreState {
  sessionId: string;
  sessionPhase: "boot" | "hydrating" | "ready";
  paused: boolean;
  startedAtMs: number | null;
  endedAtMs: number | null;
  timeElapsedMs: number;
  checkpoint: { at: number; state: GameState } | null;
}

const initialState: SessionStoreState = {
  sessionId: "game-boot",
  sessionPhase: "boot",
  paused: false,
  startedAtMs: null,
  endedAtMs: null,
  timeElapsedMs: 0,
  checkpoint: null
};

export const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    startNewSession: (state, action: PayloadAction<string | undefined>) => {
      state.paused = false;
      state.startedAtMs = null;
      state.endedAtMs = null;
      state.sessionId = action.payload ?? safeRandomId();
      state.timeElapsedMs = 0;
      state.checkpoint = null;
      state.sessionPhase = "ready";
    },
    setSessionId: (state, action: PayloadAction<string | undefined>) => {
      let newId;

      if (
        !action.payload ||
        action.payload === "game-boot" ||
        action.payload === "session-boot"
      ) {
        newId = safeRandomId();
      } else {
        newId = action.payload;
      }

      state.sessionId = newId;
    },
    setSessionPhase: (state, action: PayloadAction<SessionPhase>) => {
      state.sessionPhase = action.payload;
    },
    setPaused: (state, action: PayloadAction<boolean>) => {
      state.paused = action.payload;
    },
    setStartedAtMs: (state, action: PayloadAction<number | null>) => {
      state.startedAtMs = action.payload;
    },
    setEndedAtMs: (state, action: PayloadAction<number | null>) => {
      state.endedAtMs = action.payload;
    },
    setTimeElapsedMs: (state, action: PayloadAction<number>) => {
      state.timeElapsedMs = action.payload;
    },
    setCheckpoint: (
      state,
      action: PayloadAction<{ at: number; state: GameState } | null>
    ) => {
      state.checkpoint = action.payload;
    }
  }
});

export const sessionReducer = sessionSlice.reducer;

export const {
  startNewSession,
  setSessionId,
  setSessionPhase,
  setPaused,
  setStartedAtMs,
  setEndedAtMs,
  setTimeElapsedMs,
  setCheckpoint
} = sessionSlice.actions;

// Selectors
export const selectSessionId = (state: RootState) => state.session.sessionId;

export const selectSessionPhase = (state: RootState) =>
  state.session.sessionPhase;

export const selectPaused = (state: RootState) => state.session.paused;

export const selectStartedAtMs = (state: RootState) =>
  state.session.startedAtMs;

export const selectEndedAtMs = (state: RootState) => state.session.endedAtMs;

export const selectTimeElapsedMs = (state: RootState) =>
  state.session.timeElapsedMs;

export const selectCheckpoint = (state: RootState) => state.session.checkpoint;
