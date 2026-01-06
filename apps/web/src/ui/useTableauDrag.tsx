import { useEffect, useRef, useState } from "react";

type TableauCardLike = { card: { id: string | number }; faceDown: boolean };

export type DragSource = {
  type: "tableau";
  colIndex: number;
  startIndex: number;
};

export type DragState<TTableauItem> = {
  active: boolean;
  pointerId: number | null;
  x: number;
  y: number;
  startX: number;
  startY: number;
  baseLeft: number;
  baseTop: number;
  width: number;
  height: number;
  stack: Array<TTableauItem>;
  source: DragSource | null;
};

export type DropTarget = { type: "tableau"; colIndex: number } | null;

type UseTableauDragOptions<TTableauItem> = {
  getTableauCols?: () => Array<HTMLElement | null>;
  onDrop?: (args: {
    clientX: number;
    clientY: number;
    drag: DragState<TTableauItem>;
    dropTarget: DropTarget;
  }) => void;
};

/**
 * Owns drag state + global pointer listeners for picking up stacks from the tableau.
 * Board remains the orchestrator; this hook is the drag engine.
 */
export function useTableauDrag<
  TState extends { tableau: Array<Array<TableauCardLike>> },
  TPlayable extends { tableau: Array<Array<boolean>> }
>(
  state: TState,
  playable: TPlayable,
  options?: UseTableauDragOptions<TState["tableau"][number][number]>
) {
  type TableauItem = TState["tableau"][number][number];

  const [drag, setDrag] = useState<DragState<TableauItem>>({
    active: false,
    pointerId: null,
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

  const endDrag = () => {
    const cur = dragRef.current;
    if (!cur.active) return;
    setDrag({
      active: false,
      pointerId: null,
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

  const onGlobalPointerMove = (e: PointerEvent) => {
    const cur = dragRef.current;
    if (!cur.active) return;
    if (cur.pointerId == null || e.pointerId !== cur.pointerId) return;
    latestXYRef.current = {
      x: e.clientX - cur.startX,
      y: e.clientY - cur.startY
    };
    scheduleDragUpdate();
  };

  const onGlobalPointerUp = (e: PointerEvent) => {
    const cur = dragRef.current;
    if (!cur.active) return;
    if (cur.pointerId == null || e.pointerId !== cur.pointerId) return;

    let dropTarget: DropTarget = null;
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

    options?.onDrop?.({
      clientX: e.clientX,
      clientY: e.clientY,
      drag: cur,
      dropTarget
    });

    endDrag();
  };

  useEffect(() => {
    if (!drag.active) return;
    window.addEventListener("pointermove", onGlobalPointerMove);
    window.addEventListener("pointerup", onGlobalPointerUp);
    window.addEventListener("pointercancel", onGlobalPointerUp);
    return () => {
      window.removeEventListener("pointermove", onGlobalPointerMove);
      window.removeEventListener("pointerup", onGlobalPointerUp);
      window.removeEventListener("pointercancel", onGlobalPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag.active]);

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
      active: true,
      pointerId: e.pointerId,
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

  return { drag, setDrag, endDrag, handleTableauPointerDown };
}
