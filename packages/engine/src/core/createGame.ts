import type { Card } from "../types/card";
import type { GameState, TableauCard } from "../types/state";
import type { Rules } from "../types/rules";
import { createDeck } from "../utils/createDeck";
import { createRng } from "../utils/seededRng";
import { shuffleInPlace } from "../utils/shuffle";

const V_DEPTHS: number[] = [0, 1, 2, 3, 2, 1, 0];

function dealTableau(deck: Card[]): TableauCard[][] {
  // Tableau is 7 columns × 7 cards.
  // Convention: index 0 is the TOP of the column.
  const tableau: TableauCard[][] = [];
  let cursor = 0;

  for (let col = 0; col < 7; col++) {
    const column: TableauCard[] = [];
    for (let row = 0; row < 7; row++) {
      const card = deck[cursor++];
      column.push({ card, faceDown: false });
    }
    tableau.push(column);
  }

  return tableau;
}

function dealFreeCells(deck: Card[], cursor: number): (Card | null)[] {
  // 5 free cells total; first 3 occupied at start.
  return [deck[cursor + 0], deck[cursor + 1], deck[cursor + 2], null, null];
}

function applyVFaceDownPattern(
  tableau: TableauCard[][],
  faceDownCount: Rules["faceDownCount"]
): void {
  const layers = faceDownCount / 7; // 0,1,2,3
  if (layers <= 0) return;

  for (let col = 0; col < 7; col++) {
    const start = V_DEPTHS[col] ?? 0;
    for (let k = 0; k < layers; k++) {
      const idx = start + k;
      const tc = tableau[col]?.[idx];
      if (tc) tc.faceDown = true;
    }
  }
}

export function createGame(seed: string, rules: Rules): GameState {
  // 1) Build and shuffle deterministically from seed
  const deck = createDeck();
  const rng = createRng(seed);
  shuffleInPlace(deck, rng);

  // 2) Deal 49 to tableau, 3 to free cells
  const tableau = dealTableau(deck);
  const freeCells = dealFreeCells(deck, 49);

  // 3) Init foundations (4 empty slots, suit unset)
  const foundations: GameState["foundations"] = [
    { suit: null, cards: [] },
    { suit: null, cards: [] },
    { suit: null, cards: [] },
    { suit: null, cards: [] }
  ];

  // 4) Apply face-down V layering (deal-time difficulty)
  applyVFaceDownPattern(tableau, rules.faceDownCount);

  return { seed, rules, tableau, freeCells, foundations };
}
