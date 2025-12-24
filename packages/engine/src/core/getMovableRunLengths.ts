import type { GameState, TableauCard } from "../types/state";

/**
 * Returns how many cards are part of the movable run in a single tableau column,
 * counting from the exposed card (BOTTOM / last element) upward.
 *
 * Tableau columns are stored TOP → BOTTOM (exposed is last).
 */
export function getMovableRunLength(col: TableauCard[]): number {
  if (col.length === 0) return 0;

  const exposedIdx = col.length - 1;
  if (col[exposedIdx].faceDown) return 0;

  let count = 1;

  // Walk upward (toward index 0) while the run stays valid:
  // alternating colors, descending by 1 as you go toward the bottom (exposed card).
  for (let i = exposedIdx - 1; i >= 0; i--) {
    const upper = col[i];
    const below = col[i + 1];

    if (upper.faceDown) break;
    if (upper.card.color === below.card.color) break;
    if (upper.card.rank !== below.card.rank + 1) break;

    count++;
  }

  return count;
}

export function getMovableRunLengths(state: GameState): number[] {
  return state.tableau.map(getMovableRunLength);
}
