import type React from "react";
import type { DragSource, DragState } from "./dragTypes";

export function createPickupDragStart<
  TCard extends { id: string | number },
  TTableauItem extends { card: TCard; faceDown: boolean },
  TState extends {
    tableau: Array<Array<TTableauItem>>;
    freeCells: Array<TCard | null>;
    foundations: Array<{ cards: Array<TCard> }>;
  },
  TPlayable extends {
    tableau: Array<Array<boolean>>;
    freeCells: Array<boolean>;
  }
>(args: {
  state: TState;
  playable: TPlayable;
  allowFoundationPullback: boolean;
  makeEmptyKbFlight: () => DragState<TTableauItem>["kbFlight"];
  setDrag: React.Dispatch<React.SetStateAction<DragState<TTableauItem>>>;
}) {
  const {
    state,
    playable,
    allowFoundationPullback,
    makeEmptyKbFlight,
    setDrag
  } = args;

  const isPrimaryPointerDown = (e: React.PointerEvent) =>
    e.pointerType !== "mouse" || e.button === 0;

  const computePickupRun = (colIndex: number, startIndex: number) => {
    const col = state.tableau[colIndex];
    const mask = playable.tableau[colIndex];
    let end = startIndex;
    while (end < col.length) {
      const tc = col[end];
      if (tc.faceDown) break;
      if (!mask[end]) break;
      end++;
    }
    return col.slice(startIndex, end);
  };

  const makeSingleCardStack = (card: TCard): Array<TTableauItem> => [
    { card, faceDown: false } as TTableauItem
  ];

  const beginPendingDrag = (args: {
    e: React.PointerEvent<HTMLDivElement>;
    el: HTMLDivElement;
    stack: Array<TTableauItem>;
    source: DragSource;
  }) => {
    const { e, el, stack, source } = args;
    if (!isPrimaryPointerDown(e)) return;

    e.preventDefault();
    const rect = el.getBoundingClientRect();

    el.setPointerCapture(e.pointerId);

    setDrag({
      active: false,
      isReturning: false,
      pending: true,
      pointerId: e.pointerId,
      captureEl: el,
      x: 0,
      y: 0,
      startX: e.clientX,
      startY: e.clientY,
      baseLeft: rect.left,
      baseTop: rect.top,
      width: rect.width,
      height: rect.height,
      stack,
      source,
      kbFlight: makeEmptyKbFlight()
    });
  };

  const handleTableauPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    colIndex: number,
    tcIndex: number
  ) => {
    if (!playable.tableau[colIndex][tcIndex]) return;
    if (state.tableau[colIndex][tcIndex].faceDown) return;

    const el = e.currentTarget as HTMLDivElement;
    const stack = computePickupRun(colIndex, tcIndex);

    beginPendingDrag({
      e,
      el,
      stack,
      source: { type: "tableau", colIndex, startIndex: tcIndex }
    });
  };

  const handleFreeCellPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    index: number
  ) => {
    const card = state.freeCells[index];
    if (!card) return;
    if (!playable.freeCells[index]) return;

    const el = e.currentTarget as HTMLDivElement;

    beginPendingDrag({
      e,
      el,
      stack: makeSingleCardStack(card),
      source: { type: "freecell", index }
    });
  };

  const handleFoundationPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    index: number
  ) => {
    if (!allowFoundationPullback) return;

    const slot = state.foundations[index];
    const cards = slot?.cards;
    if (!cards || cards.length === 0) return;

    const card = cards[cards.length - 1];
    const el = e.currentTarget as HTMLDivElement;

    beginPendingDrag({
      e,
      el,
      stack: makeSingleCardStack(card),
      source: { type: "foundation", index }
    });
  };

  return {
    handleTableauPointerDown,
    handleFreeCellPointerDown,
    handleFoundationPointerDown
  };
}
