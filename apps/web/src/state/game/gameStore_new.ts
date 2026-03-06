// Redux Toolkit
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  applyMove,
  createGame,
  GameState,
  Move,
  Rules,
  UndoLimit
} from "@vcell/engine";

export type SessionPhase = "boot" | "hydrating" | "ready";
export type HistoryState = {
  present: GameState;
  past: GameState[];
};

export type GameStatus = "in_progress" | "won" | "abandoned";
export interface GameStoreState {
  seed: string;
  gameId: string;
  sessionPhase: SessionPhase;

  startedAtMs: number | null;
  endedAtMs: number | null;
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
  gameId: "game-boot",
  sessionPhase: "boot",
  startedAtMs: null,
  endedAtMs: null,
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
    startSession: (
      state,
      action: PayloadAction<{ rules: Rules; seed?: string; gameId?: string }>
    ) => {
      const seed =
        action.payload.seed && action.payload.seed !== "seed-boot"
          ? action.payload.seed
          : safeRandomId();

      const gameId =
        action.payload.gameId && action.payload.gameId !== "game-boot"
          ? action.payload.gameId
          : safeRandomId();
      const initialGame = createGame(seed, action.payload.rules);
      state.rules = action.payload.rules;

      state.seed = seed;
      state.gameId = gameId;
      state.history.present = initialGame;
      state.history.past = [];
      state.sessionPhase = "hydrating";

      state.moves = [];
      state.cursor = 0;
      state.moveCount = 0;
      state.undosUsed = 0;
      state.startedAtMs = null;
      state.endedAtMs = null;
      state.status = null;
    },
    hydrateHistory: (
      state,
      action: PayloadAction<{ present: GameState; past: GameState[] }>
    ) => {
      state.history.present = action.payload.present;
      state.history.past = action.payload.past;
    },
    hydrateFromPersisted: (
      state,
      action: PayloadAction<{
        gameId: string;
        seed: string;
        rules?: Rules;
        moves?: Move[];
        undosUsed?: number;
        cursor?: number;
        fallbackRules: Rules;
        undoLimit: UndoLimit;
        startedAtMs?: number | null;
        endedAtMs?: number | null;
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
      state.gameId = action.payload.gameId;
      state.seed = seed;
      state.history.present = present;
      state.history.past = past;
      state.sessionPhase = "ready";
      state.moves = moves ?? [];
      state.undosUsed = action.payload.undosUsed ?? 0;
      state.cursor = cursor ?? 0;
      state.moveCount = state.cursor;
      state.startedAtMs = action.payload.startedAtMs ?? null;
      state.endedAtMs = action.payload.endedAtMs ?? null;
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
      if (state.startedAtMs == null) state.startedAtMs = Date.now();

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
    setStartedAtMs: (state, action: PayloadAction<number | null>) => {
      state.startedAtMs = action.payload;
    },
    setEndedAtMs: (state, action: PayloadAction<number | null>) => {
      state.endedAtMs = action.payload;
    },
    setUndosUsed: (state, action: PayloadAction<number>) => {
      state.undosUsed = action.payload;
    },
    setStatus: (state, action: PayloadAction<GameStatus | null>) => {
      state.status = action.payload;
    },
    finalizeHydration: (state) => {
      state.sessionPhase = "ready";
    },
    resetPerSessionState: (state) => {
      state.startedAtMs = null;
      state.endedAtMs = null;
      state.undosUsed = 0;
    }
  }
});

export const {
  startSession,
  hydrateHistory,
  hydrateFromPersisted,
  applyMoveToHistory,
  undoHistory,
  resetTimeline,
  setStartedAtMs,
  setEndedAtMs,
  setUndosUsed,
  setStatus,
  finalizeHydration,
  resetPerSessionState
} = gameSlice.actions;

export const gameReducer = gameSlice.reducer;

// Selectors
export const selectSeed = (state: { game: GameStoreState }) => state.game.seed;
export const selectGameId = (state: { game: GameStoreState }) =>
  state.game.gameId;
export const selectSessionPhase = (state: { game: GameStoreState }) =>
  state.game.sessionPhase;
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
export const selectUndosUsed = (state: { game: GameStoreState }) =>
  state.game.undosUsed;
export const selectUndosRemaining = (state: { game: GameStoreState }) => {
  const rules = selectRules(state);
  const undosUsed = selectUndosUsed(state);
  if (rules.undoLimit === "unlimited") return Infinity;
  return Math.max(0, rules.undoLimit - undosUsed);
};
export const selectCanUndo = (state: { game: GameStoreState }) => {
  const sessionPhase = selectSessionPhase(state);
  if (sessionPhase !== "ready") return false;

  const history = selectHistory(state);
  const rules = selectRules(state);
  const undosUsed = selectUndosUsed(state);

  if (history.past.length === 0) return false;
  if (rules.undoLimit === "unlimited") return true;
  if (undosUsed >= rules.undoLimit) return false;
  return true;
};
export const selectStatus = (state: { game: GameStoreState }) =>
  state.game.status;
