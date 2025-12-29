// Public contract exports for @vcell/engine
export type { UndoLimit, FaceDownCount, Rules } from "./types/rules";
export type { Suit, Color, Rank, CardId, Card } from "./types/card";
export type {
  TableauIndex,
  FreeCellIndex,
  FoundationIndex,
  PileRef
} from "./types/piles";
export type { TableauCard, FoundationSlot, GameState } from "./types/state";
export type { Move } from "./types/move";
export { createGame } from "./core/createGame";
export { getLegalMoves } from "./core/getLegalMoves";
export { applyMove } from "./core/applyMove";
export { areAllCardsExposed } from "./core/areAllCardsExposed";
export { isWin } from "./core/isWin";
export { getAutoCompleteMoves } from "./core/getAutoCompleteMoves";
