import type { GameState } from "../types/state";
import { areAllCardsUnlocked } from "./areAllCardsUnlocked";

/**
 * Primary win condition for V-Cell: all cards are exposed (no buried/face-down cards).
 */
export function isWin(state: GameState): boolean {
  return areAllCardsUnlocked(state);
}
