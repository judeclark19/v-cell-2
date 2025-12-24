import { describe, it, expect } from "vitest";
import { createGame } from "./createGame";
import type { Rules } from "../types/rules";

const baseRules: Rules = {
  faceDownCount: 7,
  allowFoundationPullback: true,
  undoLimit: "unlimited"
};

function collectAllCardIds(state: ReturnType<typeof createGame>): string[] {
  const ids: string[] = [];

  for (const col of state.tableau) {
    for (const tc of col) ids.push(tc.card.id);
  }

  for (const c of state.freeCells) {
    if (c) ids.push(c.id);
  }

  for (const f of state.foundations) {
    for (const c of f.cards) ids.push(c.id);
  }

  return ids;
}

function countFaceDown(state: ReturnType<typeof createGame>): number {
  let n = 0;
  for (const col of state.tableau) {
    for (const tc of col) if (tc.faceDown) n++;
  }
  return n;
}

describe("createGame", () => {
  it("is deterministic for the same seed + rules", () => {
    const a = createGame("seed-123", baseRules);
    const b = createGame("seed-123", baseRules);
    expect(a).toEqual(b);
  });

  it("deals the correct counts and initializes empty foundations", () => {
    const s = createGame("seed-abc", baseRules);

    expect(s.tableau).toHaveLength(7);
    for (const col of s.tableau) expect(col).toHaveLength(7);

    expect(s.freeCells).toHaveLength(5);
    expect(s.freeCells.slice(0, 3).every(Boolean)).toBe(true);
    expect(s.freeCells[3]).toBeNull();
    expect(s.freeCells[4]).toBeNull();

    expect(s.foundations).toHaveLength(4);
    for (const f of s.foundations) {
      expect(f.suit).toBeNull();
      expect(f.cards).toHaveLength(0);
    }
  });

  it("contains all 52 unique cards exactly once", () => {
    const s = createGame("seed-xyz", baseRules);
    const ids = collectAllCardIds(s);

    expect(ids).toHaveLength(52);
    expect(new Set(ids).size).toBe(52);
  });

  it("applies faceDownCount correctly (0 / 7 / 14 / 21)", () => {
    const seed = "seed-faceDown";

    const s0 = createGame(seed, { ...baseRules, faceDownCount: 0 });
    expect(countFaceDown(s0)).toBe(0);

    const s7 = createGame(seed, { ...baseRules, faceDownCount: 7 });
    expect(countFaceDown(s7)).toBe(7);

    const s14 = createGame(seed, { ...baseRules, faceDownCount: 14 });
    expect(countFaceDown(s14)).toBe(14);

    const s21 = createGame(seed, { ...baseRules, faceDownCount: 21 });
    expect(countFaceDown(s21)).toBe(21);
  });
});
