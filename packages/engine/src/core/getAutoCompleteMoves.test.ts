import { describe, it, expect } from "vitest";
import { getAutoCompleteMoves } from "./getAutoCompleteMoves";
import type { Card } from "../types/card";
import type { GameState } from "../types/state";

const AS: Card = { id: "AS", suit: "spades", rank: 1, color: "black" };
const TWO_S: Card = { id: "2S", suit: "spades", rank: 2, color: "black" };
const KH: Card = { id: "KH", suit: "hearts", rank: 13, color: "red" };

function emptyState(overrides?: Partial<GameState>): GameState {
  return {
    seed: "seed",
    rules: {
      faceDownCount: 0,
      allowFoundationPullback: true,
      undoLimit: "unlimited"
    },
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

describe("getAutoCompleteMoves", () => {
  it("returns [] if not all cards are exposed", () => {
    const s = emptyState({
      tableau: [[{ card: KH, faceDown: true }], [], [], [], [], [], []]
    });
    expect(getAutoCompleteMoves(s)).toEqual([]);
  });

  it("moves Ace then 2 to the same foundation slot deterministically", () => {
    // TOP→BOTTOM; exposed is last = A♠
    const s = emptyState({
      tableau: [
        [
          { card: TWO_S, faceDown: false },
          { card: AS, faceDown: false }
        ],
        [],
        [],
        [],
        [],
        [],
        []
      ]
    });

    const moves = getAutoCompleteMoves(s);

    expect(moves.length).toBe(2);
    expect(moves[0]).toEqual({
      kind: "single",
      from: { type: "tableau", index: 0 },
      to: { type: "foundation", index: 0 }
    });
    expect(moves[1]).toEqual({
      kind: "single",
      from: { type: "tableau", index: 0 },
      to: { type: "foundation", index: 0 }
    });
  });

  it("can move from a free cell to foundation", () => {
    const s = emptyState({
      freeCells: [AS, null, null, null, null]
    });

    const moves = getAutoCompleteMoves(s);

    expect(moves.length).toBe(1);
    expect(moves[0]).toEqual({
      kind: "single",
      from: { type: "freecell", index: 0 },
      to: { type: "foundation", index: 0 }
    });
  });
});
