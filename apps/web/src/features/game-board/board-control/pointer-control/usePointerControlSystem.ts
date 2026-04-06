import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { selectPlayableMask, selectRules } from "@/state/game/gameSlice";
import type { RootState } from "@/state/reduxStore";
import { useHandleCardDoubleTap } from "./handleCardDoubleTap";
import { DragState, emptyDragState } from "./dragState";
import { useGlobalPointerDrag } from "./useGlobalPointerDrag";
import type { PerformMoveArgs } from "../useBoardControlSystem";

type UsePointerControlSystemArgs = {
  boardRef: React.RefObject<HTMLDivElement | null>;
  onCardDoubleTap: (el: HTMLElement) => void;
  isCardFlightActive: boolean;
  performMove: (args: PerformMoveArgs) => boolean;
};

export function usePointerControlSystem({
  boardRef,
  onCardDoubleTap,
  isCardFlightActive,
  performMove
}: UsePointerControlSystemArgs) {
  const playable = useSelector(selectPlayableMask);
  const rules = useSelector(selectRules);
  const foundations = useSelector(
    (state: RootState) => state.game.history.present.foundations
  );
  const tableau = useSelector(
    (state: RootState) => state.game.history.present.tableau
  );
  const freeCells = useSelector(
    (state: RootState) => state.game.history.present.freeCells
  );

  const [drag, setDrag] = useState<DragState>(emptyDragState());

  const dragRef = useRef(drag);
  const { handleCardDoubleTap } = useHandleCardDoubleTap(
    onCardDoubleTap,
    drag.pending,
    isCardFlightActive
  );

  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  const handleFoundationPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    index: number
  ) => {
    if (isCardFlightActive) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    if (!rules.allowFoundationPullback) return;

    const pile = foundations[index];
    if (!pile || pile.cards.length === 0) return;

    // minimal version: just mark drag as pending
    setDrag({
      active: false,
      pending: true,
      isReturning: false,
      source: { type: "foundation", index },
      captureEl: e.currentTarget as HTMLDivElement,
      stack: [pile.cards[pile.cards.length - 1]],
      baseLeft: e.currentTarget.getBoundingClientRect().left,
      baseTop: e.currentTarget.getBoundingClientRect().top,
      x: 0,
      y: 0,
      startX: e.clientX,
      startY: e.clientY,
      pointerId: e.pointerId
    });
  };

  const handleTableauPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    index: number,
    tcIndex: number
  ) => {
    if (isCardFlightActive) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    // 1. If this card is not playable, return
    if (!playable.tableau[index][tcIndex]) return;

    // 2. Get the tableau column from redux state
    const column = tableau[index];
    if (!column) return;

    // 3. Compute the pickup stack starting at tcIndex
    //    - include cards until:
    //      - faceDown OR
    //      - not playable
    const mask = playable.tableau[index];
    if (!mask) return;

    let end = tcIndex;

    while (end < column.length) {
      const item = column[end];
      if (item.faceDown) break;
      if (!mask[end]) break;
      end++;
    }

    const stack = column.slice(tcIndex, end).map((tc) => tc.card);
    if (stack.length === 0) return;

    // 4. Set drag state
    setDrag({
      active: false,
      pending: true,
      isReturning: false,
      source: { type: "tableau", index, startIndex: tcIndex },
      captureEl: e.currentTarget as HTMLDivElement,
      stack,
      baseLeft: e.currentTarget.getBoundingClientRect().left,
      baseTop: e.currentTarget.getBoundingClientRect().top,
      x: 0,
      y: 0,
      startX: e.clientX,
      startY: e.clientY,
      pointerId: e.pointerId
    });
    // (later)
    // 5. Optionally handle pointer-specific stuff (capture, coords, etc.)
  };

  const resetDrag = useCallback(() => {
    const cur = dragRef.current;
    if (!cur.active && !cur.pending && !cur.isReturning) return;
    setDrag(emptyDragState());
  }, [setDrag]);

  useGlobalPointerDrag({
    boardRef,
    drag,
    dragRef,
    setDrag,
    resetDrag,
    performMove
  });

  const handleFreeCellPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    index: number
  ) => {
    if (isCardFlightActive) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    const card = freeCells[index];
    if (!card) return;
    if (!playable.freeCells[index]) return;

    setDrag({
      active: false,
      pending: true,
      isReturning: false,
      captureEl: e.currentTarget as HTMLDivElement,
      source: { type: "freecell", index },
      stack: [card],
      baseLeft: e.currentTarget.getBoundingClientRect().left,
      baseTop: e.currentTarget.getBoundingClientRect().top,
      x: 0,
      y: 0,
      startX: e.clientX,
      startY: e.clientY,
      pointerId: e.pointerId
    });
  };

  return {
    drag,
    setDrag,
    handleFoundationPointerDown,
    handleTableauPointerDown,
    handleCardDoubleTap,
    handleFreeCellPointerDown,
    resetDrag
  };
}
