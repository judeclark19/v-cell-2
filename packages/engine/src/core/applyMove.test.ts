import { describe, it, expect } from "vitest";
import { applyMove, EngineError } from "./applyMove";
import type { Card } from "../types/card";
import type { GameState } from "../types/state";
import type { Rules } from "../types/rules";

const rules: Rules = {
  faceDownCount: 0,
  allowFoundationPullback: true,
  undoLimit: "unlimited"
};

const AS: Card = { id: "AS", suit: "spades", rank: 1, color: "black" };
const TWO_H: Card = { id: "2H", suit: "hearts", rank: 2, color: "red" };
const TWO_S: Card = { id: "2S", suit: "spades", rank: 2, color: "black" };
const THREE_C: Card = { id: "3C", suit: "clubs", rank: 3, color: "black" };
const FOUR_H: Card = { id: "4H", suit: "hearts", rank: 4, color: "red" };
const KH: Card = { id: "KH", suit: "hearts", rank: 13, color: "red" };

function emptyState(overrides?: Partial<GameState>): GameState {
  return {
    seed: "seed",
    rules,
    tableau: Array.from({ length: 7 }, () => []),
    freeCells: [null, null, null, null, null],
    foundations: [
      { suit: null, cards: [] },
      { suit: null, cards: [] },
      { suit: null, cards: [] },
      { suit: null, cards: [] }
    ],
    ...overrides
  };
}

describe("applyMove", () => {
  it("placing an Ace into an empty foundation sets suit", () => {
    const s = emptyState({ freeCells: [AS, null, null, null, null] });

    const next = applyMove(s, {
      kind: "single",
      from: { type: "freecell", index: 0 },
      to: { type: "foundation", index: 0 }
    });

    expect(next.freeCells[0]).toBeNull();
    expect(next.foundations[0].suit).toBe("spades");
    expect(next.foundations[0].cards.map((c) => c.id)).toEqual(["AS"]);
  });

  it("when pullback empties a foundation slot, suit becomes null again", () => {
    const s = emptyState({
      foundations: [
        { suit: "spades", cards: [AS] },
        { suit: null, cards: [] },
        { suit: null, cards: [] },
        { suit: null, cards: [] }
      ],
      freeCells: [null, null, null, null, null]
    });

    const next = applyMove(s, {
      kind: "single",
      from: { type: "foundation", index: 0 },
      to: { type: "freecell", index: 0 }
    });

    expect(next.freeCells[0]?.id).toBe("AS");
    expect(next.foundations[0].cards).toHaveLength(0);
    expect(next.foundations[0].suit).toBeNull();
  });

  it("auto-flips a newly exposed face-down card in a tableau column", () => {
    const s = emptyState({
      tableau: [
        [
          { card: TWO_S, faceDown: true }, // covered
          { card: KH, faceDown: false } // exposed
        ],
        [],
        [],
        [],
        [],
        [],
        []
      ],
      freeCells: [null, null, null, null, null]
    });

    const next = applyMove(s, {
      kind: "single",
      from: { type: "tableau", index: 0 },
      to: { type: "freecell", index: 0 }
    });

    expect(next.freeCells[0]?.id).toBe("KH");
    const exposed = next.tableau[0][next.tableau[0].length - 1];
    expect(exposed.card.id).toBe("2S");
    expect(exposed.faceDown).toBe(false);
  });
  it("allows moving an Ace from one foundation to an empty foundation", () => {
    const s = emptyState({
      foundations: [
        { suit: "spades", cards: [AS] },
        { suit: null, cards: [] },
        { suit: null, cards: [] },
        { suit: null, cards: [] }
      ]
    });

    const next = applyMove(s, {
      kind: "single",
      from: { type: "foundation", index: 0 },
      to: { type: "foundation", index: 1 }
    });

    expect(next.foundations[0].cards).toHaveLength(0);
    expect(next.foundations[0].suit).toBeNull();

    expect(next.foundations[1].suit).toBe("spades");
    expect(next.foundations[1].cards.map((c) => c.id)).toEqual(["AS"]);
  });

  it("throws if a move is not legal per getLegalMoves (dev assert)", () => {
    const s = emptyState({
      freeCells: [AS, null, null, null, null]
    });

    // This is illegal because tableau is empty; Ace cannot be placed on empty tableau (only King).
    expect(() =>
      applyMove(s, {
        kind: "single",
        from: { type: "freecell", index: 0 },
        to: { type: "tableau", index: 0 }
      })
    ).toThrow();
  });

  it("tableauStack moves the correct slice, preserves order, and leaves the source shortened", () => {
    // Valid internal stack per engine rules (TOP→BOTTOM): 3♣ then 2♥
    // Place onto 4♥ (top-moving card 3♣ goes onto 4♥).
    const s = emptyState({
      tableau: [
        [
          { card: THREE_C, faceDown: false }, // index 0 (top)
          { card: TWO_H, faceDown: false } // index 1 (bottom, exposed)
        ],
        [{ card: FOUR_H, faceDown: false }],
        [],
        [],
        [],
        [],
        []
      ]
    });

    const move = {
      kind: "tableauStack",
      from: { type: "tableau", index: 0 },
      startIndex: 0, // (or 1 in the 2nd test)
      to: { type: "tableau", index: 1 }
    } as const;

    const next = applyMove(s, {
      kind: "tableauStack",
      from: { type: "tableau", index: 0 },
      startIndex: 0,
      to: { type: "tableau", index: 1 }
    });

    // Source emptied
    expect(next.tableau[0]).toHaveLength(0);

    // Destination is existing then stack, preserving order
    expect(next.tableau[1].map((tc) => tc.card.id)).toEqual(["4H", "3C", "2H"]);
  });

  it("tableauStack triggers auto-flip when a face-down card becomes newly exposed", () => {
    // Column 0 TOP→BOTTOM: [2♠(faceDown), 3♣, 2♥]
    // Move stack starting at index 1 => move [3♣, 2♥] to column 1 onto 4♥ (legal for bottom 2♥).
    // Remaining [2♠] becomes exposed and should auto-flip.
    const s = emptyState({
      tableau: [
        [
          { card: TWO_S, faceDown: true },
          { card: THREE_C, faceDown: false },
          { card: TWO_H, faceDown: false }
        ],
        [{ card: FOUR_H, faceDown: false }],
        [],
        [],
        [],
        [],
        []
      ]
    });

    const move = {
      kind: "tableauStack",
      from: { type: "tableau", index: 0 },
      startIndex: 0, // (or 1 in the 2nd test)
      to: { type: "tableau", index: 1 }
    } as const;

    const next = applyMove(s, {
      kind: "tableauStack",
      from: { type: "tableau", index: 0 },
      startIndex: 1,
      to: { type: "tableau", index: 1 }
    });

    // Source should now have only [2♠] and it should be auto-flipped
    expect(next.tableau[0]).toHaveLength(1);
    expect(next.tableau[0][0].card.id).toBe("2S");
    expect(next.tableau[0][0].faceDown).toBe(false);

    // Destination stack order should be preserved
    expect(next.tableau[1].map((tc) => tc.card.id)).toEqual(["4H", "3C", "2H"]);
  });
});

it("throws EngineError with code ILLEGAL_MOVE for illegal moves", () => {
  const s = emptyState({
    freeCells: [AS, null, null, null, null]
  });

  try {
    applyMove(s, {
      kind: "single",
      from: { type: "freecell", index: 0 },
      to: { type: "tableau", index: 0 } // illegal (only King can go to empty tableau)
    });
    throw new Error("expected applyMove to throw");
  } catch (err) {
    expect(err).toBeInstanceOf(EngineError);
    expect((err as EngineError).code).toBe("ILLEGAL_MOVE");
  }
});
