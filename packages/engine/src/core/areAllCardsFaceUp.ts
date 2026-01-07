import type { GameState } from "../types/state";

/**
 * True when every card currently in the tableau is face-up.
 *
 * Note: This is *not* the same as "unlocked" / "playable".
 * A card can be face-up but still locked by game rules.
 */
export function areAllCardsFaceUp(state: GameState): boolean {
  for (let colIndex = 0; colIndex < state.tableau.length; colIndex++) {
    const col = state.tableau[colIndex];
    for (let i = 0; i < col.length; i++) {
      if (col[i].faceDown) return false;
    }
  }
  return true;
}
