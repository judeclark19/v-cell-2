import { useEffect, useRef, useState } from "react";

type CardLike = { card: { id: string | number }; faceDown: boolean };

export type DragSource =
  | {
      type: "tableau";
      colIndex: number;
      startIndex: number;
    }
  | {
      type: "freecell";
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
};

export type DropTarget =
  | { type: "tableau"; colIndex: number }
  | { type: "freecell"; index: number }
  | { type: "foundation"; index: number }
  | null;

type UseCardDragOptions<TCardItem> = {
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
  TState extends {
    tableau: Array<Array<CardLike>>;
    freeCells: Array<{ id: string | number } | null>;
  },
  TPlayable extends {
    tableau: Array<Array<boolean>>;
    freeCells: Array<boolean>;
  }
>(
  state: TState,
  playable: TPlayable,
  options?: UseCardDragOptions<TState["tableau"][number][number]>
) {
  type TableauItem = TState["tableau"][number][number];

  const [drag, setDrag] = useState<DragState<TableauItem>>({
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
    source: null
  });

  const dragRef = useRef(drag);
  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  const rafRef = useRef<number | null>(null);
  const latestXYRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const scheduleDragUpdate = () => {
    if (rafRef.current != null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const cur = dragRef.current;
      setDrag({ ...cur, x: latestXYRef.current.x, y: latestXYRef.current.y });
    });
  };

  const releaseCapture = (cur: DragState<TableauItem>) => {
    if (!cur.captureEl) return;
    if (cur.pointerId == null) return;
    try {
      cur.captureEl.releasePointerCapture(cur.pointerId);
    } catch {
      // ignore
    }
  };

  const endDrag = () => {
    const cur = dragRef.current;
    if (!cur.active && !cur.pending) return;
    releaseCapture(cur);
    setDrag({
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
      source: null
    });
  };

  const finalizeDrag = () => {
    const cur = dragRef.current;
    if (!cur.active && !cur.pending) return;
    releaseCapture(cur);
    setDrag({
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
      source: null
    });
  };

  const DRAG_THRESHOLD_PX = 6;

  const onGlobalPointerMove = (e: PointerEvent) => {
    const cur = dragRef.current;
    if (!cur.active && !cur.pending) return;
    if (cur.pointerId == null || e.pointerId !== cur.pointerId) return;

    // If we're animating back, ignore move updates so we don't get elastic behavior.
    if (cur.isReturning) return;

    const next = {
      x: e.clientX - cur.startX,
      y: e.clientY - cur.startY
    };

    // While pending, only start the drag after crossing a small movement threshold.
    if (cur.pending && !cur.active) {
      const dist = Math.hypot(next.x, next.y);
      if (dist < DRAG_THRESHOLD_PX) return;

      // Escalate pending → active drag.
      setDrag({ ...cur, pending: false, active: true, x: next.x, y: next.y });
      return;
    }

    latestXYRef.current = next;
    scheduleDragUpdate();
  };

  const onGlobalPointerUp = (e: PointerEvent) => {
    const cur = dragRef.current;
    if (!cur.active && !cur.pending) return;
    if (cur.pointerId == null || e.pointerId !== cur.pointerId) return;

    // If we never actually started dragging (click / dblclick), just end cleanly.
    if (cur.pending && !cur.active) {
      endDrag();
      return;
    }

    let dropTarget: DropTarget = null;

    const foundations = options?.getFoundations?.() ?? [];
    const foundationIndex = foundations.findIndex((el) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return (
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom
      );
    });

    if (foundationIndex >= 0) {
      dropTarget = { type: "foundation", index: foundationIndex };
    } else {
      const freeCells = options?.getFreeCells?.() ?? [];
      const freeCellIndex = freeCells.findIndex((el) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return (
          e.clientX >= r.left &&
          e.clientX <= r.right &&
          e.clientY >= r.top &&
          e.clientY <= r.bottom
        );
      });

      if (freeCellIndex >= 0) {
        dropTarget = { type: "freecell", index: freeCellIndex };
      } else {
        const cols = options?.getTableauCols?.() ?? [];
        const targetIndex = cols.findIndex((el) => {
          if (!el) return false;
          const r = el.getBoundingClientRect();
          return (
            e.clientX >= r.left &&
            e.clientX <= r.right &&
            e.clientY >= r.top &&
            e.clientY <= r.bottom
          );
        });

        if (targetIndex >= 0) {
          dropTarget = { type: "tableau", colIndex: targetIndex };
        }
      }
    }

    const didCommitMove =
      options?.onDrop?.({
        clientX: e.clientX,
        clientY: e.clientY,
        drag: cur,
        dropTarget
      }) ?? false;

    if (didCommitMove) {
      endDrag();
      return;
    }

    // No move committed: animate the overlay back to its origin.
    // We can release pointer capture now; returning is purely visual.
    releaseCapture(cur);
    setDrag({
      ...cur,
      pending: false,
      isReturning: true,
      x: 0,
      y: 0
    });
  };

  useEffect(() => {
    if (!drag.active && !drag.pending) return;
    window.addEventListener("pointermove", onGlobalPointerMove);
    window.addEventListener("pointerup", onGlobalPointerUp);
    window.addEventListener("pointercancel", onGlobalPointerUp);
    return () => {
      window.removeEventListener("pointermove", onGlobalPointerMove);
      window.removeEventListener("pointerup", onGlobalPointerUp);
      window.removeEventListener("pointercancel", onGlobalPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag.active, drag.pending]);

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

  const handleTableauPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    colIndex: number,
    tcIndex: number
  ) => {
    // Only primary button for mouse; touch/pen are fine.
    if (e.pointerType === "mouse" && e.button !== 0) return;

    if (!playable.tableau[colIndex][tcIndex]) return;
    if (state.tableau[colIndex][tcIndex].faceDown) return;

    e.preventDefault();
    const el = e.currentTarget as HTMLDivElement;
    const rect = el.getBoundingClientRect();

    el.setPointerCapture(e.pointerId);

    const stack = computePickupRun(colIndex, tcIndex);

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

    e.preventDefault();
    const el = e.currentTarget as HTMLDivElement;
    const rect = el.getBoundingClientRect();

    el.setPointerCapture(e.pointerId);

    // Free cell drags are always a single card.
    // Cast to TableauItem-like shape so the overlay renderer can reuse Card.
    const stack = [
      { card: card as any, faceDown: false }
    ] as unknown as Array<TableauItem>;

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
      source: { type: "freecell", index }
    });
  };

  return {
    drag,
    setDrag,
    endDrag,
    finalizeDrag,
    handleTableauPointerDown,
    handleFreeCellPointerDown
  };
}
