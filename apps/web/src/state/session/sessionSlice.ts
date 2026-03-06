import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type SessionPhase = "boot" | "hydrating" | "ready";

export interface SessionStoreState {
  sessionPhase: "boot" | "hydrating" | "ready";
  paused: boolean;
  startedAtMs: number | null;
}

const initialState: SessionStoreState = {
  sessionPhase: "boot",
  paused: false,
  startedAtMs: null
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
    }
  }
});

export const sessionReducer = sessionSlice.reducer;

export const { setSessionPhase, setPaused, setStartedAtMs } =
  sessionSlice.actions;

// Selectors
export const selectSessionPhase = (state: { session: SessionStoreState }) =>
  state.session.sessionPhase;

export const selectPaused = (state: { session: SessionStoreState }) =>
  state.session.paused;

export const selectStartedAtMs = (state: { session: SessionStoreState }) =>
  state.session.startedAtMs;
