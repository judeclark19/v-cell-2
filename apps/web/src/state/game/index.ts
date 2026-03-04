// Game should not import Session. Session is a dependency of Game, but not the other way around. This is to avoid circular dependencies and to keep the game store focused on game state management without being concerned with session management.
// Public API for the Game domain (Redux slice + selectors + types).
// Game should NOT import Session/Persistence/UI.

export type {
  GameStoreState,
  SessionPhase,
  HistoryState,
  RootState,
  AppDispatch
} from "./gameStore_new";

export {
  // actions
  startSession,
  hydrateHistory,
  hydrateFromPersisted,
  applyMoveToHistory,
  undoHistory,
  resetTimeline,
  finalizeHydration,

  // store (keep for now if you’re still using it directly)
  gameStore,

  // optional: slice (if you did step 1C)
  gameSlice,

  // selectors
  selectSeed,
  selectGameId,
  selectSessionPhase,
  selectHistory,
  selectMoves,
  selectCursor,
  selectMoveCount
} from "./gameStore_new";
