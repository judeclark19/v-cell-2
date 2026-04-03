// Redux Toolkit
import { createSlice } from "@reduxjs/toolkit";
import { createGame, GameState, Move, Rules } from "@vcell/engine";
import { gameSliceReducers } from "./reducers";

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

  isAutoCompleting: boolean;
}

const initialState: GameStoreState = {
  seed: "seed-boot",
  status: null,
  rules: {
    allowFoundationPullback: true,
    undoLimit: "unlimited",
    faceDownCount: 7
  },
  history: {
    present: createGame("seed-boot", {
      allowFoundationPullback: true,
      undoLimit: "unlimited",
      faceDownCount: 7
    }),
    past: []
  },
  moves: [],
  cursor: 0,
  moveCount: 0,
  undosUsed: 0,
  isAutoCompleting: false
};

export const gameSlice = createSlice({
  name: "game",
  initialState,
  reducers: gameSliceReducers
});

export const {
  startNewGame,
  restartCurrentGame,
  hydrateHistory,
  hydrateFromPersisted,
  applyMoveToHistory,
  undoHistory,
  resetTimeline,
  setUndosUsed,
  setUndoLimitRule,
  setFaceDownCountRule,
  setAllowFoundationPullbackRule,
  setStatus,
  setIsAutoCompleting
} = gameSlice.actions;

export const gameReducer = gameSlice.reducer;
export * from "./selectors";
