import { describe, expect, it } from "vitest";
import type { Card } from "../types/card";
import type { GameState } from "../types/state";
import { getPlayableMask } from "./getPlayableMask";

function c(id: string, rank: number, color: "red" | "black"): Card {
  const suit = id.endsWith("H")
    ? "hearts"
    : id.endsWith("D")
    ? "diamonds"
    : id.endsWith("C")
    ? "clubs"
    : "spades";
  return { id, suit, rank: rank as any, color };
}

function emptyState(partial?: Partial<GameState>): GameState {
  return {
    seed: "test-seed",
    rules: {
      faceDownCount: 7,
      allowFoundationPullback: false,
      undoLimit: 0
    },
    tableau: [[], [], [], [], [], [], []],
    freeCells: [null, null, null, null, null],
    foundations: [
      { suit: null, cards: [] },
      { suit: null, cards: [] },
      { suit: null, cards: [] },
      { suit: null, cards: [] }
    ],
    ...partial
  } as GameState;
}

describe("getPlayableMask", () => {
  it("marks freeCells playable only when a card exists", () => {
    const state = emptyState({
      freeCells: [c("AS", 1, "black"), null, c("2H", 2, "red"), null, null]
    });

    const mask = getPlayableMask(state);
    expect(mask.freeCells).toEqual([true, false, true, false, false]);
  });

  it("marks foundations playable only when pullback is enabled AND the slot has cards", () => {
    const state = emptyState({
      rules: { faceDownCount: 7, allowFoundationPullback: true, undoLimit: 0 },
      foundations: [
        { suit: "spades", cards: [c("AS", 1, "black")] },
        { suit: null, cards: [] },
        { suit: "hearts", cards: [c("AH", 1, "red"), c("2H", 2, "red")] },
        { suit: null, cards: [] }
      ] as any
    });

    const mask = getPlayableMask(state);
    expect(mask.foundations).toEqual([true, false, true, false]);
  });

  it("returns empty arrays for empty tableau columns", () => {
    const state = emptyState({
      tableau: [[], [], [], [], [], [], []]
    });

    const mask = getPlayableMask(state);
    expect(mask.tableau).toEqual([[], [], [], [], [], [], []]);
  });

  it("if the exposed (last) tableau card is faceDown, nothing in that column is playable", () => {
    const state = emptyState({
      tableau: [
        [
          { card: c("5B", 5, "black"), faceDown: false },
          { card: c("4H", 4, "red"), faceDown: true } // exposed is LAST => blocked
        ],
        [],
        [],
        [],
        [],
        [],
        []
      ] as any
    });

    const mask = getPlayableMask(state);
    expect(mask.tableau[0]).toEqual([false, false]);
  });

  it("marks exactly the movable suffix (from getMovableRunLength) as playable", () => {
    // TOP -> BOTTOM (exposed is last):
    // 6R, 7R, 8B(exposed) => run breaks immediately => only 8B playable
    const state1 = emptyState({
      tableau: [
        [
          { card: c("6H", 6, "red"), faceDown: false },
          { card: c("7D", 7, "red"), faceDown: false },
          { card: c("8S", 8, "black"), faceDown: false }
        ],
        [],
        [],
        [],
        [],
        [],
        []
      ] as any
    });

    const mask1 = getPlayableMask(state1);
    expect(mask1.tableau[0]).toEqual([false, false, true]);

    // TOP -> BOTTOM:
    // 5B, 4R, 3B(exposed) => valid descending alternating run => all 3 playable
    const state2 = emptyState({
      tableau: [
        [
          { card: c("5S", 5, "black"), faceDown: false },
          { card: c("4H", 4, "red"), faceDown: false },
          { card: c("3C", 3, "black"), faceDown: false }
        ],
        [],
        [],
        [],
        [],
        [],
        []
      ] as any
    });

    const mask2 = getPlayableMask(state2);
    expect(mask2.tableau[0]).toEqual([true, true, true]);
  });
});
