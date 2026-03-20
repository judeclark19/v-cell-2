// Redux Toolkit
import { safeRandomId, undoLimitToCap } from "@/state/utils";
import { PayloadAction, SliceCaseReducers } from "@reduxjs/toolkit";
import { FaceDownCount } from "@vcell/engine";
import {
  applyMove,
  createGame,
  GameState,
  Move,
  Rules,
  UndoLimit
} from "@vcell/engine";
import { GameStatus, GameStoreState } from ".";

export const gameSliceReducers = {
  startNewGame: (
    state,
    action: PayloadAction<{ rules?: Rules; seed?: string }>
  ) => {
    const newGameRules = action.payload.rules ?? state.rules;
    const seed =
      action.payload.seed && action.payload.seed !== "seed-boot"
        ? action.payload.seed
        : safeRandomId();

    const initialGame = createGame(seed, newGameRules);
    state.rules = newGameRules;

    state.seed = seed;
    state.history.present = initialGame;
    state.history.past = [];

    state.moves = [];
    state.cursor = 0;
    state.moveCount = 0;
    state.undosUsed = 0;
    state.status = null;
  },
  restartCurrentGame: (state) => {
    const initialGame = createGame(state.seed, state.rules);
    state.history.present = initialGame;
    state.history.past = [];

    state.moves = [];
    state.cursor = 0;
    // TODO: Have dad decide whether resetting moveCount and undosUsed on restart is desirable.
    // state.moveCount = 0;
    // state.undosUsed = 0;
    state.status = "in_progress";
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
  },
  setIsAutoCompleting: (state, action: PayloadAction<boolean>) => {
    state.isAutoCompleting = action.payload;
  }
} satisfies SliceCaseReducers<GameStoreState>;
