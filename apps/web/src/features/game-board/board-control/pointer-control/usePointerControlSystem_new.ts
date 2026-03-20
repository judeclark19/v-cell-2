import { useState } from "react";
import { useSelector } from "react-redux";
import { selectPlayableMask, selectRules } from "@/state/game/gameSlice";
import type { RootState } from "@/state/reduxStore";
import { Card } from "@vcell/engine";
import { BoardSource } from "../useBoardControlSystem_new";

type DragState = {
  active: boolean;
  pending: boolean;
  isReturning: boolean;
  source: BoardSource | null;
  stack: Array<{ card: Card; faceDown: boolean }>;
};

export function usePointerControlSystem() {
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
    stack: []
  });

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
      ]
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
      stack
    });
    // (later)
    // 5. Optionally handle pointer-specific stuff (capture, coords, etc.)
  };

  return {
    drag,
    setDrag,
    handleFoundationPointerDown,
    handleTableauPointerDown
  };
}
