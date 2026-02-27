// Redux Toolkit

import { createSlice, configureStore, PayloadAction } from "@reduxjs/toolkit";
import { createGame, GameState, Rules } from "@vcell/engine";

export type SessionPhase = "boot" | "ready";

interface GameStoreState {
  seed: string;
  gameId: string;
  sessionPhase: SessionPhase;
  history: {
    present: GameState | null;
    past: GameState[];
  };
}

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

const initialState: GameStoreState = {
  seed: safeRandomId(),
  gameId: safeRandomId(),
  sessionPhase: "boot",
  history: {
    present: null,
    past: []
  }
};

const gameSlice = createSlice({
  name: "game",
  initialState,
  reducers: {
    startSession: (
      state,
      action: PayloadAction<{ rules: Rules; seed?: string; gameId?: string }>
    ) => {
      const seed = action.payload.seed ?? crypto.randomUUID();
      const gameId = action.payload.gameId ?? crypto.randomUUID();

      const initialGame = createGame(seed, action.payload.rules);

      console.log("[gameStore_new:startSession]", {
        seed,
        gameId,
        initialGame
      });

      state.seed = seed;
      state.gameId = gameId;
      state.history.present = initialGame;
      state.history.past = [];
      state.sessionPhase = "ready";
    }
  }
});

export const { startSession } = gameSlice.actions;

export const gameStore = configureStore({
  reducer: {
    game: gameSlice.reducer
  }
});

export type RootState = ReturnType<typeof gameStore.getState>;
export type AppDispatch = typeof gameStore.dispatch;

// Selectors
export const selectSeed = (state: RootState) => state.game.seed;
export const selectGameId = (state: RootState) => state.game.gameId;
export const selectSessionPhase = (state: RootState) => state.game.sessionPhase;
export const selectPresent = (state: RootState) => state.game.history.present;
export const selectPastLength = (state: RootState) =>
  state.game.history.past.length;
