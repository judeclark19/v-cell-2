import { describe, it, expect } from "vitest";
import { areAllCardsFaceUp } from "./areAllCardsFaceUp";
import type { GameState } from "../types/state";
import type { Rank } from "../types/card";

type TestTc = { faceDown?: boolean; rank: Rank; color: "red" | "black" };

function stateWithTableau(tableau: TestTc[][]): GameState {
  return {
    seed: "seed",
    rules: {
      faceDownCount: 0,
      allowFoundationPullback: true,
      undoLimit: "unlimited"
    },
    tableau: tableau.map((col, colIdx) =>
      col.map((tc, i) => ({
        faceDown: tc.faceDown ?? false,
        card: {
          id: `${colIdx}-${i}`,
          suit: "spades",
          rank: tc.rank,
          color: tc.color
        }
      }))
    ),
    freeCells: [null, null, null, null, null],
    foundations: [
      { suit: null, cards: [] },
      { suit: null, cards: [] },
      { suit: null, cards: [] },
      { suit: null, cards: [] }
    ]
  };
}

describe("areAllCardsFaceUp", () => {
  it("true when all tableau cards are face-up", () => {
    const s = stateWithTableau([
      [{ rank: 1, color: "black" }],
      [{ rank: 2, color: "red" }],
      [{ rank: 3, color: "black" }],
      [{ rank: 4, color: "red" }],
      [{ rank: 5, color: "black" }],
      [{ rank: 6, color: "red" }],
      [{ rank: 7, color: "black" }]
    ]);

    expect(areAllCardsFaceUp(s)).toBe(true);
  });

  it("false when any tableau card is face-down", () => {
    const s = stateWithTableau([
      [{ rank: 1, color: "black" }],
      [{ rank: 2, color: "red", faceDown: true }],
      [{ rank: 3, color: "black" }],
      [{ rank: 4, color: "red" }],
      [{ rank: 5, color: "black" }],
      [{ rank: 6, color: "red" }],
      [{ rank: 7, color: "black" }]
    ]);

    expect(areAllCardsFaceUp(s)).toBe(false);
  });

  it("true for an empty tableau", () => {
    const s = stateWithTableau([[], [], [], [], [], [], []]);
    expect(areAllCardsFaceUp(s)).toBe(true);
  });
});
