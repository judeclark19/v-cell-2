import type { Card } from "../types/card";
import type { GameState } from "../types/state";
import type { Move } from "../types/move";
import type {
  FoundationIndex,
  FreeCellIndex,
  TableauIndex
} from "../types/piles";
import { applyMove } from "./applyMove";
import { areAllCardsFaceUp } from "./areAllCardsFaceUp";

function canPlaceOnFoundation(
  card: Card,
  slot: GameState["foundations"][number]
): boolean {
  if (slot.cards.length === 0) {
    if (card.rank !== 1) return false; // must be Ace

    // Some games pre-assign a suit to each foundation slot; others start unassigned.
    // Accept an Ace if the slot is unassigned OR if it matches the slot's suit.
    return slot.suit === null || slot.suit === card.suit;
  }
  const top = slot.cards[slot.cards.length - 1];
  return slot.suit === card.suit && card.rank === top.rank + 1;
}

function findBestFoundationTarget(
  state: GameState,
  card: Card
): FoundationIndex | null {
  // Deterministic: lowest slot index that accepts the card.
  for (let i = 0 as FoundationIndex; i < 4; i = (i + 1) as FoundationIndex) {
    if (canPlaceOnFoundation(card, state.foundations[i])) return i;
  }
  return null;
}

function exposedTableauCard(state: GameState, col: TableauIndex): Card | null {
  const stack = state.tableau[col];
  if (stack.length === 0) return null;
  const tc = stack[stack.length - 1]; // exposed is LAST
  if (tc.faceDown) return null; // should be unreachable if areAllCardsUnlocked == true
  return tc.card;
}

export function getAutoCompleteMoves(state: GameState): Move[] {
  if (!areAllCardsFaceUp(state)) return [];

  const moves: Move[] = [];
  let s: GameState = state;

  const MAX = 500; // safety guard

  for (let step = 0; step < MAX; step++) {
    let nextMove: Move | null = null;

    // 1) Prefer tableau exposed cards (0..6)
    for (let t = 0 as TableauIndex; t < 7; t = (t + 1) as TableauIndex) {
      const card = exposedTableauCard(s, t);
      if (!card) continue;

      const f = findBestFoundationTarget(s, card);
      if (f === null) continue;

      nextMove = {
        kind: "single",
        from: { type: "tableau", index: t },
        to: { type: "foundation", index: f }
      };
      break;
    }

    // 2) Then free cells (0..4)
    if (!nextMove) {
      for (let c = 0 as FreeCellIndex; c < 5; c = (c + 1) as FreeCellIndex) {
        const card = s.freeCells[c];
        if (!card) continue;

        const f = findBestFoundationTarget(s, card);
        if (f === null) continue;

        nextMove = {
          kind: "single",
          from: { type: "freecell", index: c },
          to: { type: "foundation", index: f }
        };
        break;
      }
    }

    if (!nextMove) break;

    moves.push(nextMove);
    s = applyMove(s, nextMove);
  }

  return moves;
}
