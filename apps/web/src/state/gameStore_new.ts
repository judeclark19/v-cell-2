// Redux Toolkit
import { createSlice, configureStore, PayloadAction } from "@reduxjs/toolkit";
import {
  applyMove,
  createGame,
  GameState,
  Move,
  Rules,
  UndoLimit
} from "@vcell/engine";

export type SessionPhase = "boot" | "ready";
export type HistoryState = {
  present: GameState;
  past: GameState[];
};
interface GameStoreState {
  seed: string;
  gameId: string;
  sessionPhase: SessionPhase;
  history: HistoryState;
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

function undoLimitToCap(undoLimit: UndoLimit): number {
  if (undoLimit === "unlimited") return Number.POSITIVE_INFINITY;
  return undoLimit;
}

const initialState: GameStoreState = {
  seed: safeRandomId(),
  gameId: safeRandomId(),
  sessionPhase: "boot",
  history: {
    present: createGame(safeRandomId(), {
      allowFoundationPullback: false,
      undoLimit: "unlimited",
      faceDownCount: 0
    }),
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
      const seed = action.payload.seed ?? safeRandomId();
      const gameId = action.payload.gameId ?? safeRandomId();

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
    },
    hydrateHistory: (
      state,
      action: PayloadAction<{ present: GameState; past: GameState[] }>
    ) => {
      state.history.present = action.payload.present;
      state.history.past = action.payload.past;
    },
    applyMoveToHistory: (
      state,
      action: PayloadAction<{
        move: Move;
        undoLimit: UndoLimit;
        isWon: boolean;
      }>
    ) => {
      const { move, undoLimit, isWon } = action.payload;

      let next: GameState;
      try {
        next = applyMove(state.history.present, move);
      } catch {
        // Invalid move: drop it.
        return;
      }

      // After a win, allow cosmetic moves but do not mutate undo history.
      if (isWon) {
        state.history.present = next;
        return;
      }

      const cap = undoLimitToCap(undoLimit);
      const nextPast = [...state.history.past, state.history.present];

      if (Number.isFinite(cap) && nextPast.length > cap) {
        // Keep the most recent `cap` states.
        nextPast.splice(0, nextPast.length - cap);
      }

      state.history.present = next;
      state.history.past = nextPast;
    },
    undoHistory: (state) => {
      if (state.history.past.length === 0) return;
      const prev = state.history.past[state.history.past.length - 1];
      state.history.present = prev;
      state.history.past = state.history.past.slice(0, -1);
    }
  }
});

export const { startSession, hydrateHistory, applyMoveToHistory, undoHistory } =
  gameSlice.actions;

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
export const selectHistory = (state: RootState) => state.game.history;
