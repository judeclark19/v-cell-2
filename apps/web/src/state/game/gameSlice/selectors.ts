import { createSelector } from "@reduxjs/toolkit";
import { getLegalMoves, getPlayableMask } from "@vcell/engine";
import { RootState } from "@/state/reduxStore";

// Selectors
export const selectSeed = (state: RootState) => state.game.seed;
export const selectHistory = (state: RootState) => state.game.history;
export const selectMoves = (state: RootState) => state.game.moves;
export const selectCursor = (state: RootState) => state.game.cursor;
export const selectMoveCount = (state: RootState) => state.game.moveCount;
export const selectRules = (state: RootState) => state.game.rules;
export const selectUndoLimit = (state: RootState) => state.game.rules.undoLimit;
export const selectUndosUsed = (state: RootState) => state.game.undosUsed;
export const selectFaceDownCount = (state: RootState) =>
  state.game.rules.faceDownCount;
export const selectUndosRemaining = (state: RootState) => {
  const undoLimit = selectUndoLimit(state);
  const undosUsed = selectUndosUsed(state);
  if (undoLimit === "unlimited") return Infinity;
  return Math.max(0, undoLimit - undosUsed);
};
export const selectCanUndo = (state: RootState) => {
  const history = selectHistory(state);
  const undoLimit = selectUndoLimit(state);
  const undosUsed = selectUndosUsed(state);

  if (history.past.length === 0) return false;
  if (undoLimit === "unlimited") return true;
  if (undosUsed >= undoLimit) return false;
  return true;
};
export const selectStatus = (state: RootState) => state.game.status;

export const selectIsFullyCollected = createSelector(
  [selectHistory],
  (history) => history.present.foundations.every((f) => f.cards.length === 13)
);
export const selectFoundationCards = createSelector(
  [(state: RootState) => state.game.history.present.foundations],
  (foundations) =>
    foundations.map((pile) => pile.cards[pile.cards.length - 1] ?? null)
);
export const selectPlayableMask = createSelector([selectHistory], (history) =>
  getPlayableMask(history.present)
);

export const selectLegalMoves = createSelector([selectHistory], (history) =>
  getLegalMoves(history.present)
);
export const selectPlayableCardIdSet = createSelector(
  [selectHistory, selectPlayableMask],
  (history, playable) => {
    const ids = new Set<string>();

    history.present.freeCells.forEach((card, index) => {
      if (card && playable.freeCells[index]) {
        ids.add(card.id);
      }
    });

    history.present.tableau.forEach((column, columnIndex) => {
      column.forEach((tableauCard, rowIndex) => {
        if (playable.tableau[columnIndex]?.[rowIndex]) {
          ids.add(tableauCard.card.id);
        }
      });
    });

    return ids;
  }
);
export const selectIsAutoCompleting = (state: RootState) =>
  state.game.isAutoCompleting;
