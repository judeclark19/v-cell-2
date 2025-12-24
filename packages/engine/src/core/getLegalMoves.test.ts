import { describe, it, expect } from "vitest";
import { getLegalMoves } from "./getLegalMoves";
import type { Card, Suit, Rank, Color } from "../types/card";
import type { GameState } from "../types/state";
import type { Rules } from "../types/rules";

function colorOfSuit(suit: Suit): Color {
  return suit === "hearts" || suit === "diamonds" ? "red" : "black";
}

function card(suit: Suit, rank: Rank): Card {
  const suitId =
    suit === "spades"
      ? "S"
      : suit === "hearts"
      ? "H"
      : suit === "clubs"
      ? "C"
      : "D";
  const rankId =
    rank === 1
      ? "A"
      : rank === 11
      ? "J"
      : rank === 12
      ? "Q"
      : rank === 13
      ? "K"
      : String(rank);

  return {
    id: `${rankId}${suitId}`,
    suit,
    rank,
    color: colorOfSuit(suit)
  };
}

const baseRules: Rules = {
  faceDownCount: 7,
  allowFoundationPullback: true,
  undoLimit: "unlimited"
};

function emptyState(overrides?: Partial<GameState>): GameState {
  return {
    seed: "test-seed",
    rules: baseRules,
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

describe("getLegalMoves (single-card rules)", () => {
  it("allows King to move to an empty tableau column", () => {
    const s = emptyState({
      tableau: [
        [{ card: card("hearts", 13), faceDown: false }],
        [],
        [],
        [],
        [],
        [],
        []
      ]
    });

    const moves = getLegalMoves(s);
    expect(
      moves.some(
        (m) =>
          m.kind === "single" &&
          m.from.type === "tableau" &&
          m.from.index === 0 &&
          m.to.type === "tableau" &&
          m.to.index === 1
      )
    ).toBe(true);
  });

  it("does NOT allow non-King to move to an empty tableau column", () => {
    const s = emptyState({
      tableau: [
        [{ card: card("hearts", 12), faceDown: false }], // Q♥
        [],
        [],
        [],
        [],
        [],
        []
      ]
    });

    const moves = getLegalMoves(s);
    expect(
      moves.some(
        (m) =>
          m.kind === "single" &&
          m.from.type === "tableau" &&
          m.from.index === 0 &&
          m.to.type === "tableau" &&
          m.to.index === 1
      )
    ).toBe(false);
  });

  it("allows descending + alternating-color moves onto tableau", () => {
    const s = emptyState({
      tableau: [
        [{ card: card("clubs", 6), faceDown: false }], // 6♣ (black)
        [{ card: card("hearts", 7), faceDown: false }], // 7♥ (red)
        [],
        [],
        [],
        [],
        []
      ]
    });

    const moves = getLegalMoves(s);
    expect(
      moves.some(
        (m) =>
          m.kind === "single" &&
          m.from.type === "tableau" &&
          m.from.index === 0 &&
          m.to.type === "tableau" &&
          m.to.index === 1
      )
    ).toBe(true);
  });

  it("allows Ace to auto-send to ANY empty foundation slot (dynamic suit assignment)", () => {
    const s = emptyState({
      freeCells: [card("spades", 1), null, null, null, null]
    });

    const moves = getLegalMoves(s).filter(
      (m) =>
        m.kind === "single" &&
        m.from.type === "freecell" &&
        m.from.index === 0 &&
        m.to.type === "foundation"
    );

    expect(moves).toHaveLength(4);
  });

  it("when pullback enabled, allows top foundation card to move to an empty freecell", () => {
    const s = emptyState({
      rules: { ...baseRules, allowFoundationPullback: true },
      foundations: [
        { suit: "spades", cards: [card("spades", 1)] },
        { suit: null, cards: [] },
        { suit: null, cards: [] },
        { suit: null, cards: [] }
      ],
      freeCells: [null, null, null, null, null]
    });

    const moves = getLegalMoves(s);
    expect(
      moves.some(
        (m) =>
          m.kind === "single" &&
          m.from.type === "foundation" &&
          m.from.index === 0 &&
          m.to.type === "freecell"
      )
    ).toBe(true);
  });

  it("when pullback disabled, does NOT allow foundation -> freecell moves", () => {
    const s = emptyState({
      rules: { ...baseRules, allowFoundationPullback: false },
      foundations: [
        { suit: "spades", cards: [card("spades", 1)] },
        { suit: null, cards: [] },
        { suit: null, cards: [] },
        { suit: null, cards: [] }
      ]
    });

    const moves = getLegalMoves(s);
    expect(
      moves.some(
        (m) =>
          m.kind === "single" &&
          m.from.type === "foundation" &&
          m.from.index === 0 &&
          m.to.type === "freecell"
      )
    ).toBe(false);
  });

  it("pullback only allows moving the TOP foundation card, and only to legal tableau or EMPTY free cells", () => {
    // Scenario A: Only-top-card rule.
    // Foundation[0] has A♠ under 2♠ (top). If the engine incorrectly allowed pulling A♠ (non-top),
    // it would allow moving A♠ onto 2♥ in tableau[0]. We assert NO foundation->tableau moves exist.
    const sOnlyTop = emptyState({
      rules: { ...baseRules, allowFoundationPullback: true },
      foundations: [
        { suit: "spades", cards: [card("spades", 1), card("spades", 2)] }, // top is 2♠
        { suit: null, cards: [] },
        { suit: null, cards: [] },
        { suit: null, cards: [] }
      ],
      tableau: [
        [{ card: card("hearts", 2), faceDown: false }], // 2♥ (would accept A♠ if it were movable)
        [],
        [],
        [],
        [],
        [],
        []
      ],
      // No empty free cells, so the only possible pullback destination would be tableau (if any).
      freeCells: [
        card("clubs", 9),
        card("diamonds", 9),
        card("hearts", 9),
        card("spades", 9),
        card("clubs", 8)
      ]
    });

    const movesOnlyTop = getLegalMoves(sOnlyTop);
    expect(
      movesOnlyTop.some(
        (m) =>
          m.kind === "single" &&
          m.from.type === "foundation" &&
          m.from.index === 0 &&
          m.to.type === "tableau"
      )
    ).toBe(false);

    // Scenario B: Allowed destinations rule.
    // Top foundation card (A♠) should be able to move to:
    // - an EMPTY free cell
    // - a legal tableau target (2♥)
    // It should NOT be able to move to:
    // - an OCCUPIED free cell
    // - an EMPTY tableau column (only Kings can go there)
    const sDestinations = emptyState({
      rules: { ...baseRules, allowFoundationPullback: true },
      foundations: [
        { suit: "spades", cards: [card("spades", 1)] }, // top is A♠
        { suit: null, cards: [] },
        { suit: null, cards: [] },
        { suit: null, cards: [] }
      ],
      tableau: [
        [{ card: card("hearts", 2), faceDown: false }], // accepts A♠
        [], // empty column should NOT accept A♠
        [],
        [],
        [],
        [],
        []
      ],
      freeCells: [card("clubs", 9), null, null, null, null] // index 0 occupied; others empty
    });

    const movesDest = getLegalMoves(sDestinations);

    // allowed: to tableau[0]
    expect(
      movesDest.some(
        (m) =>
          m.kind === "single" &&
          m.from.type === "foundation" &&
          m.from.index === 0 &&
          m.to.type === "tableau" &&
          m.to.index === 0
      )
    ).toBe(true);

    // allowed: to an empty free cell (any of 1..4)
    expect(
      movesDest.some(
        (m) =>
          m.kind === "single" &&
          m.from.type === "foundation" &&
          m.from.index === 0 &&
          m.to.type === "freecell" &&
          m.to.index !== 0
      )
    ).toBe(true);

    // not allowed: to occupied free cell[0]
    expect(
      movesDest.some(
        (m) =>
          m.kind === "single" &&
          m.from.type === "foundation" &&
          m.from.index === 0 &&
          m.to.type === "freecell" &&
          m.to.index === 0
      )
    ).toBe(false);

    // not allowed: to empty tableau[1] (only Kings)
    expect(
      movesDest.some(
        (m) =>
          m.kind === "single" &&
          m.from.type === "foundation" &&
          m.from.index === 0 &&
          m.to.type === "tableau" &&
          m.to.index === 1
      )
    ).toBe(false);
  });
});

describe("getLegalMoves (tableau stacks + blocked columns)", () => {
  it("generates tableauStack moves only from within the movable run suffix", () => {
    // Column 0 TOP→BOTTOM: 9♦, 8♠, 8♥ (exposed 8♥)
    // 8♠ -> 8♥ breaks descending rule, so runLen is 1 => no stack moves.
    const s = emptyState({
      tableau: [
        [
          { card: card("diamonds", 9), faceDown: false },
          { card: card("spades", 8), faceDown: false },
          { card: card("hearts", 8), faceDown: false }
        ],
        [],
        [],
        [],
        [],
        [],
        []
      ]
    });

    const stackMovesFrom0 = getLegalMoves(s).filter(
      (m) => m.kind === "tableauStack" && m.from.index === 0
    );

    expect(stackMovesFrom0).toHaveLength(0);
  });

  it("does not allow moving onto a non-empty tableau column whose exposed card is faceDown (blocked)", () => {
    const s = emptyState({
      tableau: [
        [{ card: card("spades", 13), faceDown: false }],
        [{ card: card("hearts", 12), faceDown: true }],
        [],
        [],
        [],
        [],
        []
      ]
    });

    const movesToBlocked1 = getLegalMoves(s).filter(
      (m) => m.kind === "single" && m.to.type === "tableau" && m.to.index === 1
    );

    expect(movesToBlocked1).toHaveLength(0);
  });
});
