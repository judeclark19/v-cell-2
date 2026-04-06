import { useEffect } from "react";
import type { DragState } from "./dragState";
import { useSelector } from "react-redux";
import {
  getPileRefFromElement,
  resolveMoveAttempt
} from "../resolveMoveAttempt";
import { selectLegalMoves } from "@/state/game/gameSlice/selectors";
import type { PerformMoveArgs } from "../useBoardControlSystem";

type GlobalPointerDragArgs = {
  boardRef: React.RefObject<HTMLDivElement | null>;
  drag: DragState;
  dragRef: React.RefObject<DragState>;
  setDrag: React.Dispatch<React.SetStateAction<DragState>>;
  resetDrag: () => void;
  performMove: (args: PerformMoveArgs) => boolean;
};

export function useGlobalPointerDrag({
  boardRef,
  drag,
  dragRef,
  setDrag,
  resetDrag,
  performMove
}: GlobalPointerDragArgs) {
  const legalMoves = useSelector(selectLegalMoves);
  useEffect(() => {
    if (!boardRef.current) return;
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
            ? (boardRef.current?.querySelector(
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

      const dropPileRef = getPileRefFromElement(dropTarget);
      const move = resolveMoveAttempt({
        source: cur.source,
        stackLength: cur.stack.length,
        dropPileRef,
        legalMoves
      });

      // if legal move, apply it
      if (move) {
        if (performMove({ move })) {
          resetDrag();
          return;
        }
      }

      // otherwise, let card fly back to origin
      setDrag({
        ...cur,
        active: false,
        pending: false,
        isReturning: true,
        x: 0,
        y: 0
      });
    };

    window.addEventListener("pointermove", onGlobalPointerMove);
    window.addEventListener("pointerup", onGlobalPointerUp);
    window.addEventListener("pointercancel", onGlobalPointerUp);

    return () => {
      window.removeEventListener("pointermove", onGlobalPointerMove);
      window.removeEventListener("pointerup", onGlobalPointerUp);
      window.removeEventListener("pointercancel", onGlobalPointerUp);
    };
  }, [
    boardRef,
    drag.pending,
    drag.active,
    resetDrag,
    setDrag,
    dragRef,
    legalMoves,
    performMove
  ]);
}
