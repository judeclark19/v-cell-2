import { describe, it, expect } from "vitest";
import { getMovableRunLength } from "./getMovableRunLengths";
import type { Card } from "../types/card";
import type { TableauCard } from "../types/state";

const c = (id: string, rank: number, color: "red" | "black"): Card => ({
  id,
  suit: "spades", // suit irrelevant for these tests
  rank: rank as any,
  color
});

describe("getMovableRunLength", () => {
  it("returns 0 for empty column", () => {
    expect(getMovableRunLength([])).toBe(0);
  });

  it("returns 0 if exposed card is faceDown (should be unreachable in normal play)", () => {
    const col: TableauCard[] = [{ card: c("X", 8, "black"), faceDown: true }];
    expect(getMovableRunLength(col)).toBe(0);
  });

  it("counts a valid run upward from the exposed bottom", () => {
    // TOP → BOTTOM (exposed is last)
    // 6♣, 5♥, 4♣ (exposed 4♣) => movable run length 3
    const col: TableauCard[] = [
      { card: c("6B", 6, "black"), faceDown: false },
      { card: c("5R", 5, "red"), faceDown: false },
      { card: c("4B", 4, "black"), faceDown: false }
    ];
    expect(getMovableRunLength(col)).toBe(3);
  });

  it("stops when the run breaks above the exposed card", () => {
    // TOP → BOTTOM
    // 6♣, 5♥, 9♦, 8♠ (exposed 8♠) => movable run is 9♦,8♠ length 2
    const col: TableauCard[] = [
      { card: c("6B", 6, "black"), faceDown: false },
      { card: c("5R", 5, "red"), faceDown: false },
      { card: c("9R", 9, "red"), faceDown: false },
      { card: c("8B", 8, "black"), faceDown: false }
    ];
    expect(getMovableRunLength(col)).toBe(2);
  });

  it("stops if an upper card is faceDown even if ranks/colors would match", () => {
    // TOP → BOTTOM
    // (faceDown)6♣, 5♥, 4♣ (exposed 4♣) => movable run is 5♥,4♣ length 2
    const col: TableauCard[] = [
      { card: c("6B", 6, "black"), faceDown: true },
      { card: c("5R", 5, "red"), faceDown: false },
      { card: c("4B", 4, "black"), faceDown: false }
    ];
    expect(getMovableRunLength(col)).toBe(2);
  });
});
