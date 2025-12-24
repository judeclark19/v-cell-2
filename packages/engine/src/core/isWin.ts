import type { GameState } from "../types/state";
import { areAllCardsExposed } from "./areAllCardsExposed";

/**
 * Primary win condition for V-Cell: all cards are exposed (no buried/face-down cards).
 */
export function isWin(state: GameState): boolean {
  return areAllCardsExposed(state);
}
