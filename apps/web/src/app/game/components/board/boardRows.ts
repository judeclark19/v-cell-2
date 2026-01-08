import type { Card as EngineCard } from "@vcell/engine";

export type BoardRowsState = {
  foundations: Array<{ cards: EngineCard[] }>;
  freeCells: Array<EngineCard | null>;
};

/**
 * Returns an array shaped like a 7-column row.
 * - `undefined` means "no cell rendered" (padding)
 * - `null` means "render an empty slot"
 * - `Card` means "render the card"
 */
export function buildFoundationsRow(
  state: BoardRowsState
): Array<EngineCard | null | undefined> {
  // Layout: [pad, pad, pad, f0, f1, f2, f3]
  return [
    undefined,
    undefined,
    undefined,
    state.foundations[0]?.cards.at(-1) ?? null,
    state.foundations[1]?.cards.at(-1) ?? null,
    state.foundations[2]?.cards.at(-1) ?? null,
    state.foundations[3]?.cards.at(-1) ?? null
  ];
}

/**
 * Returns an array shaped like a 7-column row.
 * - `undefined` means "no cell rendered" (padding)
 * - `null` means "render an empty slot"
 * - `Card` means "render the card"
 */
export function buildFreeCellsRow(
  state: BoardRowsState
): Array<EngineCard | null | undefined> {
  // Layout: [pad, c0, c1, c2, c3, c4, pad]
  return [
    undefined,
    state.freeCells[0] ?? null,
    state.freeCells[1] ?? null,
    state.freeCells[2] ?? null,
    state.freeCells[3] ?? null,
    state.freeCells[4] ?? null,
    undefined
  ];
}
