import { describe, it, expect } from "vitest";
import { applyMove } from "./applyMove";
import type { Card } from "../types/card";
import type { GameState } from "../types/state";
import type { Rules } from "../types/rules";

const rules: Rules = {
  faceDownCount: 0,
  allowFoundationPullback: true,
  undoLimit: "unlimited"
};

const AS: Card = { id: "AS", suit: "spades", rank: 1, color: "black" };
const TWO_S: Card = { id: "2S", suit: "spades", rank: 2, color: "black" };
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
});
