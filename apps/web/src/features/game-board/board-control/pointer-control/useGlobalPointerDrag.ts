import { useEffect } from "react";
import type { DragState } from "./dragState";
import type {
  PileRef,
  TableauIndex,
  FreeCellIndex,
  FoundationIndex
} from "@vcell/engine";

type Args = {
  drag: DragState;
  dragRef: React.RefObject<DragState>;
  setDrag: React.Dispatch<React.SetStateAction<DragState>>;
  resetDrag: () => void;
};

const getPileRefFromDropTarget = (dropTarget: HTMLElement): PileRef | null => {
  if (!dropTarget.dataset.region || !dropTarget.dataset.regionIndex)
    return null;

  const region = dropTarget.dataset.region;
  const regionIndex = parseInt(dropTarget.dataset.regionIndex, 10);

  if (region === "tableau") {
    return { type: "tableau", index: regionIndex as TableauIndex };
  }
  if (region === "freecell") {
    return { type: "freecell", index: regionIndex as FreeCellIndex };
  }
  if (region === "foundation") {
    return { type: "foundation", index: regionIndex as FoundationIndex };
  }

  return null;
};

export function useGlobalPointerDrag({
  drag,
  dragRef,
  setDrag,
  resetDrag
}: Args) {
  useEffect(() => {
    if (!drag.pending && !drag.active) return;

    const DRAG_THRESHOLD_PX = 6;

    const onGlobalPointerMove = (e: PointerEvent) => {
      const cur = dragRef.current;
      if (!cur.active && !cur.pending) return;
      if (cur.pointerId == null || e.pointerId !== cur.pointerId) return;
      if (cur.isReturning) return;

      const nextX = e.clientX - cur.startX;
      const nextY = e.clientY - cur.startY;

      if (cur.pending && !cur.active) {
        const dist = Math.hypot(nextX, nextY);
        if (dist < DRAG_THRESHOLD_PX) return;

        setDrag({
          ...cur,
          pending: false,
          active: true,
          x: nextX,
          y: nextY
        });
        return;
      }

      setDrag({
        ...cur,
        x: nextX,
        y: nextY
      });
    };

    const onGlobalPointerUp = (e: PointerEvent) => {
      const cur = dragRef.current;
      if (!cur.active && !cur.pending) return;
      if (cur.pointerId == null || e.pointerId !== cur.pointerId) return;

      if (cur.pending && !cur.active) {
        const cardId =
          (cur.captureEl as HTMLElement | null)?.getAttribute("data-card-id") ??
          null;

        resetDrag();

        requestAnimationFrame(() => {
          const el = cardId
            ? (document.querySelector(
                `[data-card-id="${cardId}"][data-kb-focusable="true"]`
              ) as HTMLElement | null)
            : null;

          el?.focus({ preventScroll: true });
        });

        return;
      }

      const dropTarget = document.elementsFromPoint(
        e.clientX,
        e.clientY
      )[0] as HTMLElement | null;

      if (!dropTarget) {
        resetDrag();
        return;
      }

      const pileRef = getPileRefFromDropTarget(dropTarget);

      console.log("dropPileRef", pileRef); // RESUME HERE!

      resetDrag();
    };

    window.addEventListener("pointermove", onGlobalPointerMove);
    window.addEventListener("pointerup", onGlobalPointerUp);
    window.addEventListener("pointercancel", onGlobalPointerUp);

    return () => {
      window.removeEventListener("pointermove", onGlobalPointerMove);
      window.removeEventListener("pointerup", onGlobalPointerUp);
      window.removeEventListener("pointercancel", onGlobalPointerUp);
    };
  }, [drag.pending, drag.active, resetDrag, setDrag, dragRef]);
}
