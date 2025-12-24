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
});
