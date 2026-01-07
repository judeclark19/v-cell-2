import type { GameState } from "../types/state";
import { getPlayableMask } from "./getPlayableMask";

/**
 * True when every card currently in the tableau is playable.
 *
 * Note: "playable" is derived from the engine's playable mask (i.e., what the player
 * can actually pick up / move right now), not simply whether a card is face-down.
 */
export function areAllCardsUnlocked(state: GameState): boolean {
  const playable = getPlayableMask(state);

  for (let colIndex = 0; colIndex < state.tableau.length; colIndex++) {
    const col = state.tableau[colIndex];
    for (let i = 0; i < col.length; i++) {
      if (!playable.tableau[colIndex]?.[i]) return false;
    }
  }

  return true;
}
