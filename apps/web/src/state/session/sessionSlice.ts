import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { GameState } from "@vcell/engine";

export type SessionPhase = "boot" | "hydrating" | "ready";
export interface SessionStoreState {
  gameId: string;
  sessionPhase: "boot" | "hydrating" | "ready";
  paused: boolean;
  startedAtMs: number | null;
  endedAtMs: number | null;
  timeElapsedMs: number;
  checkpoint: { at: number; state: GameState } | null;
}

// TODO: move this somewhere else
function safeRandomId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  const maybeUUID = c?.randomUUID;
  if (typeof maybeUUID === "function") return maybeUUID.call(c);

  if (c?.getRandomValues) {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const initialState: SessionStoreState = {
  gameId: "game-boot",
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
    setGameId: (state, action: PayloadAction<string | undefined>) => {
      let newId;

      if (!action.payload || action.payload === "game-boot") {
        newId = safeRandomId();
      } else {
        newId = action.payload;
      }

      state.gameId = newId;
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
  setGameId,
  setSessionPhase,
  setPaused,
  setStartedAtMs,
  setEndedAtMs,
  setTimeElapsedMs,
  setCheckpoint
} = sessionSlice.actions;

// Selectors
export const selectGameId = (state: { session: SessionStoreState }) =>
  state.session.gameId;

export const selectSessionPhase = (state: { session: SessionStoreState }) =>
  state.session.sessionPhase;

export const selectPaused = (state: { session: SessionStoreState }) =>
  state.session.paused;

export const selectStartedAtMs = (state: { session: SessionStoreState }) =>
  state.session.startedAtMs;

export const selectEndedAtMs = (state: { session: SessionStoreState }) =>
  state.session.endedAtMs;

export const selectTimeElapsedMs = (state: { session: SessionStoreState }) =>
  state.session.timeElapsedMs;

export const selectCheckpoint = (state: { session: SessionStoreState }) =>
  state.session.checkpoint;
