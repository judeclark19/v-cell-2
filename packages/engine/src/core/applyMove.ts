import type { Card } from "../types/card";
import type { GameState, TableauCard } from "../types/state";
import type { Move } from "../types/move";
import type { PileRef, TableauIndex } from "../types/piles";

import { getLegalMoves } from "./getLegalMoves";

export type EngineErrorCode =
  | "ILLEGAL_MOVE"
  | "INVALID_STATE"
  | "RULE_VIOLATION";

export class EngineError extends Error {
  readonly code: EngineErrorCode;

  constructor(code: EngineErrorCode, message: string) {
    super(message);
    this.name = "EngineError";
    this.code = code;
  }
}

function isAce(c: Card) {
  return c.rank === 1;
}
function isKing(c: Card) {
  return c.rank === 13;
}

function canPlaceOnTableau(moving: Card, targetTop: Card | null): boolean {
  if (!targetTop) return isKing(moving);
  return moving.rank === targetTop.rank - 1 && moving.color !== targetTop.color;
}

function canPlaceOnFoundation(
  moving: Card,
  slot: GameState["foundations"][number]
): boolean {
  if (slot.cards.length === 0) return slot.suit === null && isAce(moving);
  const top = slot.cards[slot.cards.length - 1];
  return slot.suit === moving.suit && moving.rank === top.rank + 1;
}

function cloneState(state: GameState): GameState {
  return {
    seed: state.seed,
    rules: state.rules,
    tableau: state.tableau.map((col) => col.map((tc) => ({ ...tc }))),
    freeCells: [...state.freeCells],
    foundations: [
      {
        suit: state.foundations[0].suit,
        cards: [...state.foundations[0].cards]
      },
      {
        suit: state.foundations[1].suit,
        cards: [...state.foundations[1].cards]
      },
      {
        suit: state.foundations[2].suit,
        cards: [...state.foundations[2].cards]
      },
      {
        suit: state.foundations[3].suit,
        cards: [...state.foundations[3].cards]
      }
    ]
  };
}

function samePileRef(a: PileRef, b: PileRef): boolean {
  if (a.type !== b.type) return false;
  // index exists on all pile refs
  return (a as any).index === (b as any).index;
}

function sameMove(a: Move, b: Move): boolean {
  if (a.kind !== b.kind) return false;

  if (a.kind === "single" && b.kind === "single") {
    return samePileRef(a.from, b.from) && samePileRef(a.to, b.to);
  }

  if (a.kind === "tableauStack" && b.kind === "tableauStack") {
    return (
      a.from.index === b.from.index &&
      a.to.index === b.to.index &&
      a.startIndex === b.startIndex
    );
  }

  return false;
}

function shouldAssertLegality(): boolean {
  // Safe for browser + node. Defaults to asserting unless explicitly production.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = (globalThis as any)?.process?.env?.NODE_ENV;
    return env !== "production";
  } catch {
    return true;
  }
}

function assertLegalMove(state: GameState, move: Move): void {
  if (!shouldAssertLegality()) return;
  const legal = getLegalMoves(state);
  if (!legal.some((m) => sameMove(m, move))) {
    throw new EngineError(
      "ILLEGAL_MOVE",
      "Invalid move: not legal per getLegalMoves"
    );
  }
}

function assertStateInvariants(s: GameState): void {
  // Shape checks
  if (s.tableau.length !== 7) {
    throw new EngineError(
      "INVALID_STATE",
      "Invalid state: tableau must have 7 columns"
    );
  }
  if (s.freeCells.length !== 5) {
    throw new EngineError(
      "INVALID_STATE",
      "Invalid state: freeCells must have length 5"
    );
  }
  if (s.foundations.length !== 4) {
    throw new EngineError(
      "INVALID_STATE",
      "Invalid state: foundations must have length 4"
    );
  }

  // After any move, the exposed (bottom) tableau card should never be faceDown.
  // (We auto-flip after moves, so this should always hold.)
  for (let i = 0 as TableauIndex; i < 7; i = (i + 1) as TableauIndex) {
    const col = s.tableau[i];
    if (col.length === 0) continue;
    const exposed = col[col.length - 1];
    if (exposed.faceDown) {
      throw new EngineError(
        "INVALID_STATE",
        `Invalid state: tableau column ${i} has a face-down exposed card`
      );
    }
  }

  // Foundations: suit metadata must match card contents.
  for (let f = 0; f < 4; f++) {
    const slot = s.foundations[f];
    if (slot.cards.length === 0) {
      if (slot.suit !== null) {
        throw new EngineError(
          "INVALID_STATE",
          `Invalid state: foundation ${f} has suit set but no cards`
        );
      }
      continue;
    }

    // Non-empty: suit must be set and match all cards.
    if (slot.suit === null) {
      throw new EngineError(
        "INVALID_STATE",
        `Invalid state: foundation ${f} has cards but suit is null`
      );
    }
    for (let i = 0; i < slot.cards.length; i++) {
      const c = slot.cards[i];
      if (c.suit !== slot.suit) {
        throw new EngineError(
          "INVALID_STATE",
          `Invalid state: foundation ${f} contains mismatched suit cards`
        );
      }
      if (i === 0) {
        if (c.rank !== 1) {
          throw new EngineError(
            "INVALID_STATE",
            `Invalid state: foundation ${f} first card must be an Ace`
          );
        }
      } else {
        const prev = slot.cards[i - 1];
        if (c.rank !== prev.rank + 1) {
          throw new EngineError(
            "INVALID_STATE",
            `Invalid state: foundation ${f} ranks are not ascending`
          );
        }
      }
    }
  }
}

function assertInvariantsIfDev(s: GameState): void {
  if (!shouldAssertLegality()) return;
  assertStateInvariants(s);
}

function flipTopIfNeeded(col: TableauCard[]): void {
  if (col.length === 0) return;
  if (col[col.length - 1].faceDown) col[col.length - 1].faceDown = false;
}

function removeSingleFrom(from: PileRef, s: GameState): Card {
  if (from.type === "tableau") {
    const col = s.tableau[from.index];
    if (!col || col.length === 0)
      throw new EngineError("ILLEGAL_MOVE", "Invalid move: empty tableau");
    if (col[col.length - 1].faceDown)
      throw new EngineError(
        "ILLEGAL_MOVE",
        "Invalid move: top tableau card is face-down"
      );
    const removed = col.pop();
    if (!removed)
      throw new EngineError(
        "ILLEGAL_MOVE",
        "Invalid move: could not remove tableau card"
      );
    return removed.card;
  }

  if (from.type === "freecell") {
    const c = s.freeCells[from.index];
    if (!c)
      throw new EngineError("ILLEGAL_MOVE", "Invalid move: empty freecell");
    s.freeCells[from.index] = null;
    return c;
  }

  // foundation
  if (!s.rules.allowFoundationPullback) {
    throw new EngineError(
      "ILLEGAL_MOVE",
      "Invalid move: foundation pullback disabled"
    );
  }
  const slot = s.foundations[from.index];
  if (!slot || slot.cards.length === 0)
    throw new EngineError("ILLEGAL_MOVE", "Invalid move: empty foundation");
  const c = slot.cards.pop();
  if (!c)
    throw new EngineError(
      "ILLEGAL_MOVE",
      "Invalid move: could not pop foundation card"
    );
  if (slot.cards.length === 0) slot.suit = null; // unset when emptied
  return c;
}

function placeSingleTo(to: PileRef, card: Card, s: GameState): void {
  if (to.type === "freecell") {
    if (s.freeCells[to.index])
      throw new EngineError("ILLEGAL_MOVE", "Invalid move: freecell occupied");
    s.freeCells[to.index] = card;
    return;
  }

  if (to.type === "foundation") {
    const slot = s.foundations[to.index];
    if (!canPlaceOnFoundation(card, slot))
      throw new EngineError(
        "ILLEGAL_MOVE",
        "Invalid move: cannot place on foundation"
      );
    if (slot.cards.length === 0) slot.suit = card.suit; // lock suit on first Ace
    slot.cards.push(card);
    return;
  }

  // tableau
  const col = s.tableau[to.index];
  const isEmpty = col.length === 0;
  const topTc = isEmpty ? null : col[col.length - 1];
  const targetTop = isEmpty ? null : topTc!.faceDown ? null : topTc!.card;
  if (!isEmpty && targetTop === null)
    throw new EngineError(
      "ILLEGAL_MOVE",
      "Invalid move: target tableau blocked by face-down top"
    );

  if (!canPlaceOnTableau(card, targetTop))
    throw new EngineError(
      "ILLEGAL_MOVE",
      "Invalid move: cannot place on tableau"
    );
  col.push({ card, faceDown: false });
}

function isValidStack(stack: TableauCard[]): boolean {
  // All must be face-up and internally valid: descending ranks + alternating colors (top -> bottom)
  for (const tc of stack) {
    if (tc.faceDown) return false;
  }
  for (let i = 0; i < stack.length - 1; i++) {
    const upper = stack[i].card; // closer to top
    const below = stack[i + 1].card; // closer to bottom
    if (upper.rank !== below.rank + 1) return false;
    if (upper.color === below.color) return false;
  }
  return true;
}

export function applyMove(state: GameState, move: Move): GameState {
  assertLegalMove(state, move);
  const s = cloneState(state);

  if (move.kind === "single") {
    const card = removeSingleFrom(move.from, s);
    placeSingleTo(move.to, card, s);

    // auto-flip any newly exposed face-down top cards
    for (let i = 0 as TableauIndex; i < 7; i = (i + 1) as TableauIndex) {
      flipTopIfNeeded(s.tableau[i]);
    }
    assertInvariantsIfDev(s);
    return s;
  }

  // tableauStack (tableau -> tableau only)
  const fromIdx = move.from.index;
  const toIdx = move.to.index;

  if (fromIdx === toIdx)
    throw new EngineError(
      "ILLEGAL_MOVE",
      "Invalid move: same source/destination tableau"
    );

  const fromCol = s.tableau[fromIdx];
  const toCol = s.tableau[toIdx];

  if (!fromCol || fromCol.length === 0)
    throw new EngineError("ILLEGAL_MOVE", "Invalid move: empty tableau source");
  if (move.startIndex < 0 || move.startIndex >= fromCol.length) {
    throw new EngineError(
      "ILLEGAL_MOVE",
      "Invalid move: startIndex out of range"
    );
  }

  const stack = fromCol.slice(move.startIndex);
  const remaining = fromCol.slice(0, move.startIndex);

  if (!isValidStack(stack))
    throw new EngineError(
      "ILLEGAL_MOVE",
      "Invalid move: stack not internally valid or contains face-down cards"
    );

  // Validate placement using the TOP card of the moving stack
  // const bottomCard = stack[stack.length - 1].card;
  const topCard = stack[0].card;

  const targetIsEmpty = toCol.length === 0;
  const targetTopCard = targetIsEmpty
    ? null
    : toCol[toCol.length - 1].faceDown
      ? null
      : toCol[toCol.length - 1].card;

  if (!targetIsEmpty && targetTopCard === null) {
    throw new EngineError(
      "ILLEGAL_MOVE",
      "Invalid move: target tableau blocked by face-down top"
    );
  }

  if (!canPlaceOnTableau(topCard, targetTopCard)) {
    throw new EngineError(
      "ILLEGAL_MOVE",
      "Invalid move: cannot place stack on tableau"
    );
  }

  // Perform move: place the stack on top of destination, preserving order
  s.tableau[fromIdx] = remaining;
  s.tableau[toIdx] = [...toCol, ...stack];

  // auto-flip newly exposed tops
  for (let i = 0 as TableauIndex; i < 7; i = (i + 1) as TableauIndex) {
    flipTopIfNeeded(s.tableau[i]);
  }
  assertInvariantsIfDev(s);
  return s;
}
