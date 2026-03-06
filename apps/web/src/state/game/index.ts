// Public API for the Game domain

export type {
  GameStoreState,
  SessionPhase,
  HistoryState
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
  selectCanUndo
} from "./gameStore_new";
