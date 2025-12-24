import type { GameState } from "../types/state";

/**
 * True when there are no face-down (buried) cards remaining in the tableau.
 * Tableau arrays are TOP → BOTTOM; faceDown indicates a buried card.
 */
export function areAllCardsExposed(state: GameState): boolean {
  for (const col of state.tableau) {
    for (const tc of col) {
      if (tc.faceDown) return false;
    }
  }
  return true;
}
