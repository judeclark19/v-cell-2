"use client";

import { useCallback } from "react";

import type { Card, PileRef } from "@vcell/engine";
import type { DropTarget } from "@/ui/useCardDrag";

import {
  buildKbDragFromEl as buildKbDragFromDom,
  buildKbDropTargetFromEl as buildKbDropTargetFromDom,
  buildPileRefFromEl as buildPileRefFromDom,
  findFoundationIndexForEl,
  findFreeCellIndexForEl,
  findTableauSourceForEl,
  type KbDrag,
  type TableauCard
} from "./boardDomMapping";

export type BoardNodeMeta =
  | {
      region: "tableau";
      col: number;
      row: 1;
      tableauCol: number;
      tableauIndex: number; // -1 represents the empty slot / column container
    }
  | { region: "freecell"; col: number; row: 2; index: number }
  | { region: "foundation"; col: number; row: 0; index: number };

export interface UseBoardDomMappingArgs {
  tableauColRefs: React.MutableRefObject<Array<HTMLDivElement | null>>;
  freeCellRefs: React.MutableRefObject<Array<HTMLDivElement | null>>;
  foundationRefs: React.MutableRefObject<Array<HTMLDivElement | null>>;

  // Engine state slices needed for DOM→engine mapping.
  tableau: TableauCard[][];
  freeCells: Array<Card | null>;
  foundations: Array<{ cards: Card[] }>;
}

/**
 * Drop-in extraction of the DOM→engine mapping logic that used to live inline in Board.tsx.
 *
 * This hook is intentionally thin: it binds stable refs + current engine state slices
 * to the pure helpers in `boardDomMapping.ts`.
 */
export function useBoardDomMapping({
  tableauColRefs,
  freeCellRefs,
  foundationRefs,
  tableau,
  freeCells,
  foundations
}: UseBoardDomMappingArgs) {
  const buildPileRefFromEl = useCallback(
    (el: HTMLElement): PileRef | null =>
      buildPileRefFromDom({
        el,
        tableauColRefs: tableauColRefs.current,
        freeCellRefs: freeCellRefs.current,
        foundationRefs: foundationRefs.current,
        tableau
      }),
    [tableau, tableauColRefs, freeCellRefs, foundationRefs]
  );

  const buildKbDragFromEl = useCallback(
    (el: HTMLElement): KbDrag | null =>
      buildKbDragFromDom({
        el,
        tableauColRefs: tableauColRefs.current,
        freeCellRefs: freeCellRefs.current,
        foundationRefs: foundationRefs.current,
        tableau,
        freeCells,
        foundations
      }),
    [
      tableau,
      freeCells,
      foundations,
      tableauColRefs,
      freeCellRefs,
      foundationRefs
    ]
  );

  const buildKbDropTargetFromEl = useCallback(
    (el: HTMLElement): DropTarget | null =>
      buildKbDropTargetFromDom({
        el,
        tableauColRefs: tableauColRefs.current,
        freeCellRefs: freeCellRefs.current,
        foundationRefs: foundationRefs.current
      }),
    [tableauColRefs, freeCellRefs, foundationRefs]
  );

  // Board keyboard nav expects a unified grid mental model:
  // - tableau columns are 0..6 (row 1)
  // - freecells are visually in columns 1..5 (row 2)
  // - foundations are visually in columns 3..6 (row 0)
  const getNodeMeta = useCallback(
    (el: HTMLElement): BoardNodeMeta | null => {
      const t = findTableauSourceForEl(el, tableauColRefs.current, tableau);
      if (t) {
        return {
          region: "tableau",
          col: t.colIndex,
          row: 1,
          tableauCol: t.colIndex,
          tableauIndex: t.startIndex
        };
      }

      // Handle focusable empty tableau column slots (the column container itself).
      for (
        let colIndex = 0;
        colIndex < tableauColRefs.current.length;
        colIndex++
      ) {
        const colEl = tableauColRefs.current[colIndex];
        if (!colEl) continue;
        if (colEl === el || colEl.contains(el)) {
          return {
            region: "tableau",
            col: colIndex,
            row: 1,
            tableauCol: colIndex,
            tableauIndex: -1
          };
        }
      }

      const freeIndex = findFreeCellIndexForEl(el, freeCellRefs.current);
      if (freeIndex !== null) {
        return {
          region: "freecell",
          col: freeIndex + 1,
          row: 2,
          index: freeIndex
        };
      }

      const fIndex = findFoundationIndexForEl(el, foundationRefs.current);
      if (fIndex !== null) {
        return {
          region: "foundation",
          col: fIndex + 3,
          row: 0,
          index: fIndex
        };
      }

      return null;
    },
    [tableau, tableauColRefs, freeCellRefs, foundationRefs]
  );

  return {
    buildPileRefFromEl,
    buildKbDragFromEl,
    buildKbDropTargetFromEl,
    getNodeMeta
  };
}
