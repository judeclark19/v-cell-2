import { useEffect, useRef, useState } from "react";
import { useDropTargetHover } from "./useDropTargetHover";
import { resolveDropTargetFromPoint } from "./resolveDropTargetFromPoint";
import { usePointerDragController } from "./usePointerDragController";

export type DragSource =
  | {
      type: "tableau";
      colIndex: number;
      startIndex: number;
    }
  | {
      type: "freecell";
      index: number;
    }
  | {
      type: "foundation";
      index: number;
    };

export type DragState<TCardItem> = {
  active: boolean;
  isReturning: boolean;
  pending: boolean;
  pointerId: number | null;
  captureEl: HTMLDivElement | null;
  x: number;
  y: number;
  startX: number;
  startY: number;
  baseLeft: number;
  baseTop: number;
  width: number;
  height: number;
  stack: Array<TCardItem>;
  source: DragSource | null;
  kbFlight: {
    active: boolean;
    /** Card ids in the flying stack. Used by board regions to suppress destination duplicates. */
    cardIds: string[];
    /** Target pile for suppression. */
    dropTarget: DropTarget;
    /** Optional override for kb-flight transition duration (ms). */
    durationMs?: number;
  };
};

export type DropTarget =
  | { type: "tableau"; colIndex: number }
  | { type: "freecell"; index: number }
  | { type: "foundation"; index: number }
  | null;

type UseCardDragOptions<TCardItem> = {
  allowFoundationPullback?: boolean;
  getTableauCols?: () => Array<HTMLElement | null>;
  getFreeCells?: () => Array<HTMLElement | null>;
  getFoundations?: () => Array<HTMLElement | null>;
  onDrop?: (args: {
    clientX: number;
    clientY: number;
    drag: DragState<TCardItem>;
    dropTarget: DropTarget;
  }) => boolean;
};

/**
 * Owns drag state + global pointer listeners for picking up stacks from the tableau.
 * Board remains the orchestrator; this hook is the drag engine.
 */
export function useCardDrag<
  TCard extends { id: string | number },
  TState extends {
    tableau: Array<Array<{ card: TCard; faceDown: boolean }>>;
    freeCells: Array<TCard | null>;
    foundations: Array<{ cards: Array<TCard> }>;
  },
  TPlayable extends {
    tableau: Array<Array<boolean>>;
    freeCells: Array<boolean>;
  }
>(
  state: TState,
  playable: TPlayable,
  options?: UseCardDragOptions<{ card: TCard; faceDown: boolean }>
) {
  type TableauItem = TState["tableau"][number][number];

  const EMPTY_KB_FLIGHT: DragState<TableauItem>["kbFlight"] = {
    active: false,
    cardIds: [],
    dropTarget: null
  };

  const emptyDrag = (): DragState<TableauItem> => ({
    active: false,
    isReturning: false,
    pending: false,
    pointerId: null,
    captureEl: null,
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
    baseLeft: 0,
    baseTop: 0,
    width: 0,
    height: 0,
    stack: [],
    source: null,
    kbFlight: EMPTY_KB_FLIGHT
  });

  const [drag, setDrag] = useState<DragState<TableauItem>>(emptyDrag);

  const dragRef = useRef(drag);

  const dropHover = useDropTargetHover({
    enabled: drag.active || drag.pending,
    selectors: [".is-playable", ".card-slot"],
    className: "is-kb-drop-target"
  });

  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  const releaseCapture = (cur: DragState<TableauItem>) => {
    if (!cur.captureEl) return;
    if (cur.pointerId == null) return;
    try {
      cur.captureEl.releasePointerCapture(cur.pointerId);
    } catch {
      // ignore
    }
  };

  const resetDrag = () => {
    const cur = dragRef.current;
    if (!cur.active && !cur.pending) return;
    dropHover.clear();
    releaseCapture(cur);
    setDrag(emptyDrag());
  };

  usePointerDragController<TableauItem>({
    active: drag.active,
    pending: drag.pending,
    dragRef,
    setDrag,
    dropHover,
    releaseCapture,
    resetDrag,
    resolveDropTarget: (clientX, clientY) =>
      resolveDropTargetFromPoint({
        clientX,
        clientY,
        getFoundations: options?.getFoundations,
        getFreeCells: options?.getFreeCells,
        getTableauCols: options?.getTableauCols
      }) as DropTarget,
    onDrop: options?.onDrop
  });

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
    return col.slice(startIndex, end) as Array<TableauItem>;
  };

  const beginPendingDrag = (args: {
    e: React.PointerEvent<HTMLDivElement>;
    el: HTMLDivElement;
    stack: Array<TableauItem>;
    source: DragSource;
  }) => {
    const { e, el, stack, source } = args;

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
      kbFlight: EMPTY_KB_FLIGHT
    });
  };

  const handleTableauPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    colIndex: number,
    tcIndex: number
  ) => {
    // Only primary button for mouse; touch/pen are fine.
    if (e.pointerType === "mouse" && e.button !== 0) return;

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
    // Only primary button for mouse; touch/pen are fine.
    if (e.pointerType === "mouse" && e.button !== 0) return;

    const card = state.freeCells[index];
    if (!card) return;
    if (!playable.freeCells[index]) return;

    const el = e.currentTarget as HTMLDivElement;

    // Free cell drags are always a single card.
    const stack: Array<TableauItem> = [{ card, faceDown: false }];

    beginPendingDrag({
      e,
      el,
      stack,
      source: { type: "freecell", index }
    });
  };

  const handleFoundationPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    index: number
  ) => {
    // Only primary button for mouse; touch/pen are fine.
    if (e.pointerType === "mouse" && e.button !== 0) return;

    // If rules disallow foundation pullback, do not start a drag.
    if (options?.allowFoundationPullback === false) return;

    const slot = state.foundations[index];
    const cards = slot?.cards;
    if (!cards || cards.length === 0) return;

    const card = cards[cards.length - 1];

    const el = e.currentTarget as HTMLDivElement;

    // Foundation drags are always a single card.
    const stack: Array<TableauItem> = [{ card, faceDown: false }];

    beginPendingDrag({
      e,
      el,
      stack,
      source: { type: "foundation", index }
    });
  };

  const startKbFlight = (args: {
    fromEl: HTMLElement;
    toEl: HTMLElement;
    stack: Array<TableauItem>;
    source: DragSource | null;
    dropTarget: DropTarget;
    durationMs?: number;
  }) => {
    const { fromEl, toEl, stack, source, dropTarget, durationMs } = args;

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    // Start a visual-only drag at the source location.
    // We set `isReturning: true` so DragLayer transition-end can finalize it.
    setDrag({
      active: true,
      isReturning: true,
      pending: false,
      pointerId: null,
      captureEl: null,
      x: 0,
      y: 0,
      startX: 0,
      startY: 0,
      baseLeft: fromRect.left,
      baseTop: fromRect.top,
      width: fromRect.width,
      height: fromRect.height,
      stack,
      source,
      kbFlight: {
        active: true,
        cardIds: stack.map((tc) => String(tc.card.id)),
        dropTarget,
        durationMs
      }
    });

    // Animate to the destination on the next frame so CSS transition can run.
    window.requestAnimationFrame(() => {
      const cur = dragRef.current;
      if (!cur.active) return;
      if (!cur.kbFlight.active) return;

      const dx = toRect.left - fromRect.left;
      const dy = toRect.top - fromRect.top;

      setDrag({ ...cur, x: dx, y: dy });
    });
  };

  return {
    drag,
    setDrag,
    resetDrag,
    handleTableauPointerDown,
    handleFreeCellPointerDown,
    handleFoundationPointerDown,
    startKbFlight
  };
}
