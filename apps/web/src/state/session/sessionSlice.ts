import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type SessionPhase = "boot" | "hydrating" | "ready";

export interface SessionStoreState {
  sessionPhase: "boot" | "hydrating" | "ready";
  paused: boolean;
}

const initialState: SessionStoreState = {
  sessionPhase: "boot",
  paused: false
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
    }
  }
});

export const sessionReducer = sessionSlice.reducer;

export const { setSessionPhase, setPaused } = sessionSlice.actions;

// Selectors
export const selectSessionPhase = (state: { session: SessionStoreState }) =>
  state.session.sessionPhase;

export const selectPaused = (state: { session: SessionStoreState }) =>
  state.session.paused;
