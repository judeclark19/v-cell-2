import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type SessionPhase = "boot" | "hydrating" | "ready";

export interface SessionStoreState {
  sessionPhase: "boot" | "hydrating" | "ready";
  paused: boolean;
  startedAtMs: number | null;
  endedAtMs: number | null;
}

const initialState: SessionStoreState = {
  sessionPhase: "boot",
  paused: false,
  startedAtMs: null,
  endedAtMs: null
};

export const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
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
    }
  }
});

export const sessionReducer = sessionSlice.reducer;

export const { setSessionPhase, setPaused, setStartedAtMs, setEndedAtMs } =
  sessionSlice.actions;

// Selectors
export const selectSessionPhase = (state: { session: SessionStoreState }) =>
  state.session.sessionPhase;

export const selectPaused = (state: { session: SessionStoreState }) =>
  state.session.paused;

export const selectStartedAtMs = (state: { session: SessionStoreState }) =>
  state.session.startedAtMs;

export const selectEndedAtMs = (state: { session: SessionStoreState }) =>
  state.session.endedAtMs;
