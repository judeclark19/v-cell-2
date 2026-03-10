import { createSelector } from "@reduxjs/toolkit";
import { GameStoreState } from ".";
import { getLegalMoves, getPlayableMask } from "@vcell/engine";

// Selectors
export const selectSeed = (state: { game: GameStoreState }) => state.game.seed;
export const selectHistory = (state: { game: GameStoreState }) =>
  state.game.history;
export const selectMoves = (state: { game: GameStoreState }) =>
  state.game.moves;
export const selectCursor = (state: { game: GameStoreState }) =>
  state.game.cursor;
export const selectMoveCount = (state: { game: GameStoreState }) =>
  state.game.moveCount;
export const selectRules = (state: { game: GameStoreState }) =>
  state.game.rules;
export const selectUndoLimit = (state: { game: GameStoreState }) =>
  state.game.rules.undoLimit;
export const selectUndosUsed = (state: { game: GameStoreState }) =>
  state.game.undosUsed;
export const selectFaceDownCount = (state: { game: GameStoreState }) =>
  state.game.rules.faceDownCount;
export const selectUndosRemaining = (state: { game: GameStoreState }) => {
  const undoLimit = selectUndoLimit(state);
  const undosUsed = selectUndosUsed(state);
  if (undoLimit === "unlimited") return Infinity;
  return Math.max(0, undoLimit - undosUsed);
};
export const selectCanUndo = (state: { game: GameStoreState }) => {
  const history = selectHistory(state);
  const undoLimit = selectUndoLimit(state);
  const undosUsed = selectUndosUsed(state);

  if (history.past.length === 0) return false;
  if (undoLimit === "unlimited") return true;
  if (undosUsed >= undoLimit) return false;
  return true;
};
export const selectStatus = (state: { game: GameStoreState }) =>
  state.game.status;

export const selectIsFullyCollected = createSelector(
  [selectHistory],
  (history) => history.present.foundations.every((f) => f.cards.length === 13)
);
export const selectPlayableMask = createSelector([selectHistory], (history) =>
  getPlayableMask(history.present)
);

export const selectLegalMoves = createSelector([selectHistory], (history) =>
  getLegalMoves(history.present)
);
