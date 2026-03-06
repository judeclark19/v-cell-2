// Public API for the Game domain

export type {
  GameStoreState,
  SessionPhase,
  HistoryState,
  GameStatus
} from "./gameStore_new";

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
  selectPaused
} from "./gameStore_new";
