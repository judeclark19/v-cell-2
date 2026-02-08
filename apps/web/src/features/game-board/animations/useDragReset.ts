import type React from "react";
import type { DragState } from "./dragTypes";
import { useCallback } from "react";

export function useDragReset<TItem>(args: {
  dragRef: React.RefObject<DragState<TItem>>;
  setDrag: React.Dispatch<React.SetStateAction<DragState<TItem>>>;
  emptyDrag: () => DragState<TItem>;
  dropHover: { clear: () => void };
}) {
  const { dragRef, setDrag, emptyDrag, dropHover } = args;

  const releaseCapture = useCallback((cur: DragState<TItem>) => {
    if (!cur.captureEl) return;
    if (cur.pointerId == null) return;
    try {
      cur.captureEl.releasePointerCapture(cur.pointerId);
    } catch {
      // ignore
    }
  }, []);

  const resetDrag = useCallback(() => {
    const cur = dragRef.current;
    if (!cur.active && !cur.pending) return;
    dropHover.clear();
    releaseCapture(cur);
    setDrag(emptyDrag());
  }, [dragRef, dropHover, emptyDrag, releaseCapture, setDrag]);

  return { releaseCapture, resetDrag };
}
