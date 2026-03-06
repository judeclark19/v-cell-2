// Public API for the Game domain

export type { GameStoreState, HistoryState, GameStatus } from "./gameSlice";

export {
  gameSlice,
  gameReducer,
  hydrateHistory,
  applyMoveToHistory,
  undoHistory,
  resetTimeline,
  resetPerSessionState,
  setUndosUsed,
  setStatus,
  selectSeed,
  selectHistory,
  selectMoves,
  selectCursor,
  selectMoveCount,
  selectRules,
  selectUndosUsed,
  selectUndosRemaining,
  selectCanUndo,
  selectStatus
} from "./gameSlice";
