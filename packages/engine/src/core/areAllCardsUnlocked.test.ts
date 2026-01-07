import { describe, it, expect } from "vitest";
import { areAllCardsUnlocked } from "./areAllCardsUnlocked";
import { isWin } from "./isWin";
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

describe("areAllCardsUnlocked / isWin", () => {
  it("true when all tableau cards are playable", () => {
    const s = stateWithTableau([
      [{ rank: 1, color: "black" }],
      [{ rank: 2, color: "red" }],
      [{ rank: 3, color: "black" }],
      [{ rank: 4, color: "red" }],
      [{ rank: 5, color: "black" }],
      [{ rank: 6, color: "red" }],
      [{ rank: 7, color: "black" }]
    ]);
    expect(areAllCardsUnlocked(s)).toBe(true);
    expect(isWin(s)).toBe(true);
  });

  it("false when any tableau card is not playable (locked)", () => {
    // Column 0 has two face-up cards, but they do NOT form a valid movable run.
    // Bottom card is playable; the card above it should be locked.
    const s = stateWithTableau([
      [
        { rank: 7, color: "red" },
        { rank: 9, color: "black" }
      ],
      [{ rank: 2, color: "red" }],
      [{ rank: 3, color: "black" }],
      [{ rank: 4, color: "red" }],
      [{ rank: 5, color: "black" }],
      [{ rank: 6, color: "red" }],
      [{ rank: 1, color: "black" }]
    ]);
    expect(areAllCardsUnlocked(s)).toBe(false);
    expect(isWin(s)).toBe(false);
  });
});
