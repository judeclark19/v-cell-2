// Redux Toolkit
import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { FaceDownCount, getLegalMoves, getPlayableMask } from "@vcell/engine";
import {
  applyMove,
  createGame,
  GameState,
  Move,
  Rules,
  UndoLimit
} from "@vcell/engine";
import { create } from "domain";

export type HistoryState = {
  present: GameState;
  past: GameState[];
};

export type GameStatus = "in_progress" | "won" | "abandoned";
export interface GameStoreState {
  seed: string;
  status: GameStatus | null;

  rules: Rules;
  history: HistoryState;

  moves: Move[];
  cursor: number;
  moveCount: number;
  undosUsed: number;
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
  seed: "seed-boot",
  status: null,
  rules: {
    allowFoundationPullback: false,
    undoLimit: "unlimited",
    faceDownCount: 7
  },
  history: {
    present: createGame("seed-boot", {
      allowFoundationPullback: false,
      undoLimit: "unlimited",
      faceDownCount: 7
    }),
    past: []
  },
  moves: [],
  cursor: 0,
  moveCount: 0,
  undosUsed: 0
};

export const gameSlice = createSlice({
  name: "game",
  initialState,
  reducers: {
    startNewGame: (
      state,
      action: PayloadAction<{ rules: Rules; seed?: string }>
    ) => {
      const seed =
        action.payload.seed && action.payload.seed !== "seed-boot"
          ? action.payload.seed
          : safeRandomId();

      const initialGame = createGame(seed, action.payload.rules);
      state.rules = action.payload.rules;

      state.seed = seed;
      state.history.present = initialGame;
      state.history.past = [];

      state.moves = [];
      state.cursor = 0;
      state.moveCount = 0;
      state.undosUsed = 0;
      state.status = null;
    },
    hydrateHistory: (
      // TODO: wtap these hydrate functions into transitionGameAndSession?
      state,
      action: PayloadAction<{ present: GameState; past: GameState[] }>
    ) => {
      state.history.present = action.payload.present;
      state.history.past = action.payload.past;
    },
    hydrateFromPersisted: (
      state,
      action: PayloadAction<{
        seed: string;
        rules?: Rules;
        moves?: Move[];
        undosUsed?: number;
        cursor?: number;
        fallbackRules: Rules;
        undoLimit: UndoLimit;
        status?: GameStatus | null;
      }>
    ) => {
      const { seed, rules, moves, cursor, fallbackRules, undoLimit } =
        action.payload;

      const appliedMoves = (moves ?? []).slice(0, cursor ?? 0);

      let present = createGame(seed, rules ?? fallbackRules);
      const past: GameState[] = [];

      for (const m of appliedMoves) {
        past.push(present);
        try {
          present = applyMove(present, m);
        } catch {
          // Fail-soft: revert to base deal
          present = createGame(seed, rules ?? fallbackRules);
          past.length = 0;
          break;
        }

        if (undoLimit !== "unlimited" && past.length > undoLimit) {
          past.splice(0, past.length - undoLimit);
        }
      }

      state.rules = rules ?? fallbackRules;
      state.seed = seed;
      state.history.present = present;
      state.history.past = past;
      state.moves = moves ?? [];
      state.undosUsed = action.payload.undosUsed ?? 0;
      state.cursor = cursor ?? 0;
      state.moveCount = state.cursor;
      state.status = action.payload.status ?? null;
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

      // Record move in timeline (truncate “future” if we had undone).
      if (state.cursor < state.moves.length) {
        state.moves = state.moves.slice(0, state.cursor);
      }
      state.moves.push(move);
      state.cursor += 1;
      state.moveCount = state.cursor;

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
      state.cursor = Math.max(0, state.cursor - 1);
      state.moveCount = Math.min(state.moveCount, state.cursor);
      state.undosUsed += 1;
    },
    resetTimeline: (state) => {
      state.moves = [];
      state.cursor = 0;
      state.moveCount = 0;
      state.undosUsed = 0;
    },
    setUndosUsed: (state, action: PayloadAction<number>) => {
      state.undosUsed = action.payload;
    },
    setUndoLimitRule: (state, action: PayloadAction<UndoLimit>) => {
      state.rules.undoLimit = action.payload;
    },
    setFaceDownCountRule: (state, action: PayloadAction<FaceDownCount>) => {
      state.rules.faceDownCount = action.payload;
    },
    setStatus: (state, action: PayloadAction<GameStatus | null>) => {
      state.status = action.payload;
    }
  }
});

export const {
  startNewGame,
  hydrateHistory,
  hydrateFromPersisted,
  applyMoveToHistory,
  undoHistory,
  resetTimeline,
  setUndosUsed,
  setUndoLimitRule,
  setFaceDownCountRule,
  setStatus
} = gameSlice.actions;

export const gameReducer = gameSlice.reducer;

// Selectors
export const selectSeed = (state: { game: GameStoreState }) => state.game.seed;
export const selectHistory = (state: { game: GameStoreState }) =>
  state.game.history;
export const selectMoves = (state: { game: GameStoreState }) =>
  state.game.moves;
export const selectCursor = (state: { game: GameStoreState }) =>
  state.game.cursor;
export const selectMoveCount = (state: { game: GameStoreState }) =>
  state.game.moveCount;
export const selectRules = (state: { game: GameStoreState }) =>
  state.game.rules;
export const selectUndoLimit = (state: { game: GameStoreState }) =>
  state.game.rules.undoLimit;
export const selectUndosUsed = (state: { game: GameStoreState }) =>
  state.game.undosUsed;
export const selectFaceDownCount = (state: { game: GameStoreState }) =>
  state.game.rules.faceDownCount;
export const selectUndosRemaining = (state: { game: GameStoreState }) => {
  const undoLimit = selectUndoLimit(state);
  const undosUsed = selectUndosUsed(state);
  if (undoLimit === "unlimited") return Infinity;
  return Math.max(0, undoLimit - undosUsed);
};
export const selectCanUndo = (state: { game: GameStoreState }) => {
  const history = selectHistory(state);
  const undoLimit = selectUndoLimit(state);
  const undosUsed = selectUndosUsed(state);

  if (history.past.length === 0) return false;
  if (undoLimit === "unlimited") return true;
  if (undosUsed >= undoLimit) return false;
  return true;
};
export const selectStatus = (state: { game: GameStoreState }) =>
  state.game.status;

export const selectIsFullyCollected = createSelector(
  [selectHistory],
  (history) => history.present.foundations.every((f) => f.cards.length === 13)
);
export const selectPlayableMask = createSelector([selectHistory], (history) =>
  getPlayableMask(history.present)
);

export const selectLegalMoves = createSelector([selectHistory], (history) =>
  getLegalMoves(history.present)
);
