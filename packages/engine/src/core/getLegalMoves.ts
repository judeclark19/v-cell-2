import type { Card } from "../types/card";
import type { GameState } from "../types/state";
import type { Move } from "../types/move";
import type {
  PileRef,
  TableauIndex,
  FoundationIndex,
  FreeCellIndex
} from "../types/piles";

function isAce(c: Card) {
  return c.rank === 1;
}

function isKing(c: Card) {
  return c.rank === 13;
}

function canPlaceOnTableau(moving: Card, targetTop: Card | null): boolean {
  if (!targetTop) return isKing(moving);
  // descending rank, alternating colors
  return moving.rank === targetTop.rank - 1 && moving.color !== targetTop.color;
}

function canPlaceOnFoundation(
  moving: Card,
  slot: GameState["foundations"][number]
): boolean {
  if (slot.cards.length === 0) {
    return slot.suit === null && isAce(moving);
  }
  const top = slot.cards[slot.cards.length - 1];
  return slot.suit === moving.suit && moving.rank === top.rank + 1;
}

function topTableauCard(state: GameState, i: TableauIndex) {
  const col = state.tableau[i];
  if (!col || col.length === 0) return null;
  const tc = col[col.length - 1]; // exposed is LAST
  if (tc.faceDown) return null;
  return tc.card;
}

function topFoundationCard(state: GameState, i: FoundationIndex) {
  const slot = state.foundations[i];
  if (!slot || slot.cards.length === 0) return null;
  return slot.cards[slot.cards.length - 1];
}

function occupiedFreeCells(
  state: GameState
): Array<{ index: FreeCellIndex; card: Card }> {
  const out: Array<{ index: FreeCellIndex; card: Card }> = [];
  for (let i = 0 as FreeCellIndex; i < 5; i = (i + 1) as FreeCellIndex) {
    const c = state.freeCells[i];
    if (c) out.push({ index: i, card: c });
  }
  return out;
}

function emptyFreeCells(state: GameState): FreeCellIndex[] {
  const out: FreeCellIndex[] = [];
  for (let i = 0 as FreeCellIndex; i < 5; i = (i + 1) as FreeCellIndex) {
    if (!state.freeCells[i]) out.push(i);
  }
  return out;
}

export function getLegalMoves(state: GameState): Move[] {
  const moves: Move[] = [];

  // ---- Helpers for pushing a single move
  const pushSingle = (from: PileRef, to: PileRef) => {
    moves.push({ kind: "single", from, to });
  };

  // ---- Sources: tableau tops
  for (let i = 0 as TableauIndex; i < 7; i = (i + 1) as TableauIndex) {
    const card = topTableauCard(state, i);
    if (!card) continue;

    const from: PileRef = { type: "tableau", index: i };

    // to freecells
    for (const fc of emptyFreeCells(state)) {
      pushSingle(from, { type: "freecell", index: fc });
    }

    // to foundations
    for (let f = 0 as FoundationIndex; f < 4; f = (f + 1) as FoundationIndex) {
      if (canPlaceOnFoundation(card, state.foundations[f])) {
        pushSingle(from, { type: "foundation", index: f });
      }
    }

    // to tableau (single-card moves)
    for (let t = 0 as TableauIndex; t < 7; t = (t + 1) as TableauIndex) {
      if (t === i) continue;
      const targetTop = topTableauCard(state, t); // null if empty or facedown top
      // If column is non-empty but top is facedown, it is effectively blocked.
      // Our topTableauCard returns null in that case; but an actually blocked column is not empty.
      // So we need to distinguish empty vs blocked:
      const isActuallyEmpty = state.tableau[t].length === 0;

      if (!isActuallyEmpty && targetTop === null) continue;

      const ok = canPlaceOnTableau(card, targetTop);
      if (ok) pushSingle(from, { type: "tableau", index: t });
    }
  }

  // ---- Sources: freecells occupied
  for (const { index, card } of occupiedFreeCells(state)) {
    const from: PileRef = { type: "freecell", index };

    // to foundations
    for (let f = 0 as FoundationIndex; f < 4; f = (f + 1) as FoundationIndex) {
      if (canPlaceOnFoundation(card, state.foundations[f])) {
        pushSingle(from, { type: "foundation", index: f });
      }
    }

    // to tableau
    for (let t = 0 as TableauIndex; t < 7; t = (t + 1) as TableauIndex) {
      const targetTop = topTableauCard(state, t);
      const isActuallyEmpty = state.tableau[t].length === 0;
      if (!isActuallyEmpty && targetTop === null) continue;
      if (canPlaceOnTableau(card, targetTop)) {
        pushSingle(from, { type: "tableau", index: t });
      }
    }
  }

  // ---- Sources: foundation pullback (optional)
  if (state.rules.allowFoundationPullback) {
    for (let f = 0 as FoundationIndex; f < 4; f = (f + 1) as FoundationIndex) {
      const card = topFoundationCard(state, f);
      if (!card) continue;

      const from: PileRef = { type: "foundation", index: f };

      // to freecells (empty only)
      for (const fc of emptyFreeCells(state)) {
        pushSingle(from, { type: "freecell", index: fc });
      }

      // to tableau
      for (let t = 0 as TableauIndex; t < 7; t = (t + 1) as TableauIndex) {
        const targetTop = topTableauCard(state, t);
        const isActuallyEmpty = state.tableau[t].length === 0;
        if (!isActuallyEmpty && targetTop === null) continue;
        if (canPlaceOnTableau(card, targetTop)) {
          pushSingle(from, { type: "tableau", index: t });
        }
      }
    }
  }

  return moves;
}
