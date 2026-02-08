import { useEffect, useRef } from "react";
import type { DragState, DropTarget } from "./useCardDrag";

type DropHover = {
  clear: () => void;
  updateFromPoint: (clientX: number, clientY: number) => void;
};

export function usePointerDragController<TCardItem>(args: {
  active: boolean;
  pending: boolean;

  dragRef: React.MutableRefObject<DragState<TCardItem>>;
  setDrag: React.Dispatch<React.SetStateAction<DragState<TCardItem>>>;
  dropHover: DropHover;

  releaseCapture: (cur: DragState<TCardItem>) => void;
  resetDrag: () => void;

  resolveDropTarget: (clientX: number, clientY: number) => DropTarget;
  onDrop?: (args: {
    clientX: number;
    clientY: number;
    drag: DragState<TCardItem>;
    dropTarget: DropTarget;
  }) => boolean;
}) {
  const {
    active,
    pending,
    dragRef,
    setDrag,
    dropHover,
    releaseCapture,
    resetDrag,
    resolveDropTarget,
    onDrop
  } = args;

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

    // Track the current drop target under the pointer (as a state class, not :hover).
    dropHover.updateFromPoint(e.clientX, e.clientY);

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
      resetDrag();
      return;
    }

    const dropTarget = resolveDropTarget(e.clientX, e.clientY);

    const didCommitMove =
      onDrop?.({
        clientX: e.clientX,
        clientY: e.clientY,
        drag: cur,
        dropTarget
      }) ?? false;

    if (didCommitMove) {
      resetDrag();
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
    if (!active && !pending) return;
    window.addEventListener("pointermove", onGlobalPointerMove);
    window.addEventListener("pointerup", onGlobalPointerUp);
    window.addEventListener("pointercancel", onGlobalPointerUp);
    return () => {
      dropHover.clear();
      window.removeEventListener("pointermove", onGlobalPointerMove);
      window.removeEventListener("pointerup", onGlobalPointerUp);
      window.removeEventListener("pointercancel", onGlobalPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, pending]);
}
