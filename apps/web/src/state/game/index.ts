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
  setStartedAtMs,
  setEndedAtMs,
  setTimeElapsedMs,
  setUndosUsed,
  setStatus,
  selectSeed,
  selectGameId,
  selectHistory,
  selectMoves,
  selectCursor,
  selectMoveCount,
  selectRules,
  selectUndosUsed,
  selectUndosRemaining,
  selectCanUndo,
  selectStatus,
  selectTimeElapsedMs
} from "./gameSlice";
