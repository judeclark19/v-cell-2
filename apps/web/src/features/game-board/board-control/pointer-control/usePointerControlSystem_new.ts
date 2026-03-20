import { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { selectPlayableMask, selectRules } from "@/state/game/gameSlice";
import type { RootState } from "@/state/reduxStore";
import type { Card } from "@vcell/engine";
import { BoardSource } from "../useBoardControlSystem_new";

type DragState = {
  active: boolean;
  pending: boolean;
  isReturning: boolean;
  source: BoardSource | null;
  stack: Array<{ card: Card; faceDown: boolean }>;
  baseLeft: number;
  baseTop: number;
  x: number;
  y: number;
};

type UsePointerControlSystemArgs = {
  onCardDoubleTap: (el: HTMLElement) => void;
};

export function usePointerControlSystem({
  onCardDoubleTap
}: UsePointerControlSystemArgs) {
  const playable = useSelector(selectPlayableMask);
  const rules = useSelector(selectRules);
  const foundations = useSelector(
    (state: RootState) => state.game.history.present.foundations
  );
  const tableau = useSelector(
    (state: RootState) => state.game.history.present.tableau
  );

  const [drag, setDrag] = useState<DragState>({
    active: false,
    pending: false,
    isReturning: false,
    source: null,
    stack: [],
    baseLeft: 0,
    baseTop: 0,
    x: 0,
    y: 0
  });
  const lastTapRef = useRef<{
    t: number;
    x: number;
    y: number;
    cardId: string;
  } | null>(null);

  const handleFoundationPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    index: number
  ) => {
    if (!rules.allowFoundationPullback) return;

    const pile = foundations[index];
    if (!pile || pile.cards.length === 0) return;

    // minimal version: just mark drag as pending
    setDrag({
      active: false,
      pending: true,
      isReturning: false,
      source: { type: "foundation", index },
      stack: [
        {
          card: pile.cards[pile.cards.length - 1],
          faceDown: false
        }
      ],
      baseLeft: e.currentTarget.getBoundingClientRect().left,
      baseTop: e.currentTarget.getBoundingClientRect().top,
      x: 0,
      y: 0
    });
  };

  const handleTableauPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    index: number,
    tcIndex: number
  ) => {
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

    const stack = column.slice(tcIndex, end);
    if (stack.length === 0) return;

    // 4. Set drag state
    setDrag({
      active: false,
      pending: true,
      isReturning: false,
      source: { type: "tableau", index, startIndex: tcIndex },
      stack,
      baseLeft: e.currentTarget.getBoundingClientRect().left,
      baseTop: e.currentTarget.getBoundingClientRect().top,
      x: 0,
      y: 0
    });
    // (later)
    // 5. Optionally handle pointer-specific stuff (capture, coords, etc.)
  };

  const handleCardDoubleTap = (e: React.PointerEvent<HTMLDivElement>) => {
    // 1. Ignore mouse — dblclick handles desktop
    if (e.pointerType === "mouse") return;

    // 2. Extract card identity from the element
    const el = e.currentTarget as HTMLElement;
    const cardId = el.dataset.cardId;
    if (!cardId) return;

    const now = performance.now();
    const x = e.clientX;
    const y = e.clientY;

    const processTap = () => {
      const last = lastTapRef.current;

      // 3. Double-tap detection thresholds
      const MAX_DT_MS = 300;
      const MAX_DIST_PX = 12;

      if (last) {
        const dt = now - last.t;
        const dist = Math.hypot(x - last.x, y - last.y);
        const sameCard = last.cardId === cardId;

        // 4. If valid double-tap → trigger board-level action
        if (dt <= MAX_DT_MS && dist <= MAX_DIST_PX && sameCard) {
          lastTapRef.current = null;
          onCardDoubleTap(el);
          return;
        }
      }

      // 5. Otherwise store this tap for the next comparison
      lastTapRef.current = { t: now, x, y, cardId };
    };

    // 6. If a drag is still pending, defer so drag cleanup runs first
    if (drag.pending) {
      queueMicrotask(processTap);
      return;
    }

    processTap();
  };

  return {
    drag,
    setDrag,
    handleFoundationPointerDown,
    handleTableauPointerDown,
    handleCardDoubleTap
  };
}
