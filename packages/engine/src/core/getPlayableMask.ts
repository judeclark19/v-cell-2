import type { GameState } from "../types/state";
import type { TableauIndex } from "../types/piles";
import { getMovableRunLength } from "./getMovableRunLengths";

export type PlayableMask = {
  // Same shape as state.tableau: true if that tableau card is in the movable suffix.
  tableau: boolean[][];
  // true if that free cell card exists (and is therefore playable as a single-card source)
  freeCells: boolean[];
  // true if foundation pullback is allowed AND the foundation has at least 1 card
  foundations: boolean[];
};

function isBlockedTableauColumn(state: GameState, i: TableauIndex): boolean {
  const col = state.tableau[i];
  if (!col || col.length === 0) return false;
  return col[col.length - 1].faceDown; // exposed is LAST
}

export function getPlayableMask(state: GameState): PlayableMask {
  const tableau: boolean[][] = state.tableau.map(() => []);
  const freeCells: boolean[] = state.freeCells.map((c) => c != null);
  const foundations: boolean[] = state.foundations.map((slot) => {
    if (!state.rules.allowFoundationPullback) return false;
    return slot.cards.length > 0;
  });

  for (let i = 0 as TableauIndex; i < 7; i = (i + 1) as TableauIndex) {
    const col = state.tableau[i];
    if (!col || col.length === 0) {
      tableau[i] = [];
      continue;
    }

    // If the exposed card is faceDown, nothing in this column is playable.
    if (isBlockedTableauColumn(state, i)) {
      tableau[i] = col.map(() => false);
      continue;
    }

    const runLen = getMovableRunLength(col);
    const start = col.length - runLen; // movable suffix start
    tableau[i] = col.map((tc, idx) => !tc.faceDown && idx >= start);
  }

  return { tableau, freeCells, foundations };
}
