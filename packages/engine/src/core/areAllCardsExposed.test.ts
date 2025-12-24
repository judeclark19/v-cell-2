import { describe, it, expect } from "vitest";
import { areAllCardsExposed } from "./areAllCardsExposed";
import { isWin } from "./isWin";
import type { GameState } from "../types/state";

function stateWithTableau(faceDownMap: boolean[][]): GameState {
  return {
    seed: "seed",
    rules: {
      faceDownCount: 0,
      allowFoundationPullback: true,
      undoLimit: "unlimited"
    },
    tableau: faceDownMap.map((col, colIdx) =>
      col.map((fd, i) => ({
        faceDown: fd,
        card: { id: `${colIdx}-${i}`, suit: "spades", rank: 1, color: "black" }
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

describe("areAllCardsExposed / isWin", () => {
  it("true when no face-down cards exist", () => {
    const s = stateWithTableau([
      [false],
      [false],
      [false],
      [false],
      [false],
      [false],
      [false]
    ]);
    expect(areAllCardsExposed(s)).toBe(true);
    expect(isWin(s)).toBe(true);
  });

  it("false when any face-down card exists", () => {
    const s = stateWithTableau([
      [false, true],
      [false],
      [false],
      [false],
      [false],
      [false],
      [false]
    ]);
    expect(areAllCardsExposed(s)).toBe(false);
    expect(isWin(s)).toBe(false);
  });
});
