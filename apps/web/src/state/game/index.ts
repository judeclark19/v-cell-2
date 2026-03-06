// Public API for the Game domain

export type {
  GameStoreState,
  SessionPhase,
  HistoryState,
  GameStatus
} from "./gameSlice";

export {
  gameSlice,
  gameReducer,
  startSession,
  hydrateHistory,
  hydrateFromPersisted,
  applyMoveToHistory,
  undoHistory,
  resetTimeline,
  finalizeHydration,
  resetPerSessionState,
  setStartedAtMs,
  setEndedAtMs,
  setTimeElapsedMs,
  setUndosUsed,
  setStatus,
  setPaused,
  selectSeed,
  selectGameId,
  selectSessionPhase,
  selectHistory,
  selectMoves,
  selectCursor,
  selectMoveCount,
  selectRules,
  selectUndosUsed,
  selectUndosRemaining,
  selectCanUndo,
  selectStatus,
  selectPaused,
  selectTimeElapsedMs
} from "./gameSlice";
