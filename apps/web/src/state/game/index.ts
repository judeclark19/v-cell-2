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
  selectSeed,
  selectGameId,
  selectSessionPhase,
  selectHistory,
  selectMoves,
  selectCursor,
  selectMoveCount
} from "./gameStore_new";
