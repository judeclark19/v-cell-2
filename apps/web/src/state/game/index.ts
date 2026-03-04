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
  setStartedAtMs,
  setEndedAtMs,
  selectSeed,
  selectGameId,
  selectSessionPhase,
  selectHistory,
  selectMoves,
  selectCursor,
  selectMoveCount,
  selectRules,
  selectFaceDownCount,
  selectUndoLimit,
  selectAllowFoundationPullback
} from "./gameStore_new";
