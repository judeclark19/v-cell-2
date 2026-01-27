import type {
  Card,
  PileRef,
  TableauIndex,
  FreeCellIndex,
  FoundationIndex
} from "@vcell/engine";

import type {
  DragSource,
  DropTarget
} from "@/features/game-board/animations/useCardDrag";

function toBoundedIndex<T extends number>(n: number, len: number): T | null {
  return Number.isInteger(n) && n >= 0 && n < len ? (n as T) : null;
}

type TableauSource = { colIndex: TableauIndex; startIndex: number };

export function getCardIdFromEl(el: HTMLElement): string | null {
  const dataId = el.getAttribute("data-card-id") || el.dataset.cardId;
  if (dataId) return dataId;

  const aria = el.getAttribute("aria-label") || "";
  if (aria.startsWith("Card ")) {
    const rest = aria.slice(5);
    const id = rest.split(",")[0]?.trim();
    return id || null;
  }

  return null;
}

export function findFreeCellIndexForEl(
  el: HTMLElement,
  freeCellRefs: Array<HTMLDivElement | null>
): FreeCellIndex | null {
  for (let i = 0; i < freeCellRefs.length; i++) {
    const slotEl = freeCellRefs[i];
    if (!slotEl) continue;
    if (slotEl.contains(el) || slotEl === el)
      return toBoundedIndex<FreeCellIndex>(i, freeCellRefs.length);
  }
  return null;
}

export function findFoundationIndexForEl(
  el: HTMLElement,
  foundationRefs: Array<HTMLDivElement | null>
): FoundationIndex | null {
  for (let i = 0; i < foundationRefs.length; i++) {
    const slotEl = foundationRefs[i];
    if (!slotEl) continue;
    if (slotEl.contains(el) || slotEl === el)
      return toBoundedIndex<FoundationIndex>(i, foundationRefs.length);
  }
  return null;
}

export function findTableauSourceForEl(
  el: HTMLElement,
  tableauColRefs: Array<HTMLDivElement | null>,
  tableau: Array<Array<{ card: { id: string } }>>
): TableauSource | null {
  for (let colIndex = 0; colIndex < tableauColRefs.length; colIndex++) {
    const colEl = tableauColRefs[colIndex];
    if (!colEl) continue;
    if (!colEl.contains(el)) continue;

    const cardId = getCardIdFromEl(el);
    if (!cardId) return null;

    const col = tableau[colIndex];
    if (!col) return null;

    const startIndex = col.findIndex((tc) => tc.card.id === cardId);
    if (startIndex < 0) return null;

    const ti = toBoundedIndex<TableauIndex>(colIndex, tableauColRefs.length);
    if (ti == null) return null;

    return { colIndex: ti, startIndex };
  }

  return null;
}

export function buildPileRefFromEl(args: {
  el: HTMLElement;
  tableauColRefs: Array<HTMLDivElement | null>;
  freeCellRefs: Array<HTMLDivElement | null>;
  foundationRefs: Array<HTMLDivElement | null>;
  tableau: Array<Array<{ card: { id: string } }>>;
}): PileRef | null {
  const { el, tableauColRefs, freeCellRefs, foundationRefs, tableau } = args;

  const t = findTableauSourceForEl(el, tableauColRefs, tableau);
  if (t) {
    return { type: "tableau", index: t.colIndex };
  }

  const freeIndex = findFreeCellIndexForEl(el, freeCellRefs);
  if (freeIndex != null) return { type: "freecell", index: freeIndex };

  const fIndex = findFoundationIndexForEl(el, foundationRefs);
  if (fIndex != null) return { type: "foundation", index: fIndex };

  return null;
}

export type TableauCard = { card: Card; faceDown: boolean };

export type KbAttrs = {
  focusable: boolean;
  dropTarget: boolean;
};

export function getKbAttrsForMeta(args: {
  kbCarrying: boolean;
  playable: boolean;
  isEmptySlot: boolean;
  isLegalDropTarget: boolean;
}): KbAttrs {
  const { kbCarrying, playable, isEmptySlot, isLegalDropTarget } = args;

  const focusable = kbCarrying ? playable || isEmptySlot : playable;
  const dropTarget = kbCarrying && isLegalDropTarget;

  return { focusable, dropTarget };
}

export type KbDrag = {
  source: DragSource;
  stack: TableauCard[];
};

export function buildKbDragFromEl(args: {
  el: HTMLElement;
  tableauColRefs: Array<HTMLDivElement | null>;
  freeCellRefs: Array<HTMLDivElement | null>;
  foundationRefs: Array<HTMLDivElement | null>;
  tableau: TableauCard[][];
  freeCells: Array<Card | null>;
  foundations: Array<{ cards: Card[] }>;
}): KbDrag | null {
  const {
    el,
    tableauColRefs,
    freeCellRefs,
    foundationRefs,
    tableau,
    freeCells,
    foundations
  } = args;

  const t = findTableauSourceForEl(el, tableauColRefs, tableau);
  if (t) {
    const col = tableau[t.colIndex];
    if (!col) return null;

    const stack = col.slice(t.startIndex);
    if (stack.length === 0) return null;

    return {
      source: {
        type: "tableau",
        colIndex: t.colIndex,
        startIndex: t.startIndex
      },
      stack
    };
  }

  const freeIndex = findFreeCellIndexForEl(el, freeCellRefs);
  if (freeIndex != null) {
    const card = freeCells[freeIndex] ?? null;
    if (!card) return null;
    return {
      source: { type: "freecell", index: freeIndex },
      stack: [{ card, faceDown: false }]
    };
  }

  const fIndex = findFoundationIndexForEl(el, foundationRefs);
  if (fIndex != null) {
    const slot = foundations[fIndex];
    const card = slot?.cards?.length ? slot.cards[slot.cards.length - 1] : null;
    if (!card) return null;
    return {
      source: { type: "foundation", index: fIndex },
      stack: [{ card, faceDown: false }]
    };
  }

  return null;
}

export function buildKbDropTargetFromEl(args: {
  el: HTMLElement;
  tableauColRefs: Array<HTMLDivElement | null>;
  freeCellRefs: Array<HTMLDivElement | null>;
  foundationRefs: Array<HTMLDivElement | null>;
}): DropTarget | null {
  const { el, tableauColRefs, freeCellRefs, foundationRefs } = args;

  // Tableau: any element within a column counts as that column.
  for (let colIndex = 0; colIndex < tableauColRefs.length; colIndex++) {
    const colEl = tableauColRefs[colIndex];
    if (!colEl) continue;
    if (colEl.contains(el) || colEl === el) {
      return { type: "tableau", colIndex };
    }
  }

  const freeIndex = findFreeCellIndexForEl(el, freeCellRefs);
  if (freeIndex != null) return { type: "freecell", index: freeIndex };

  const fIndex = findFoundationIndexForEl(el, foundationRefs);
  if (fIndex != null) return { type: "foundation", index: fIndex };

  return null;
}
