import { useState } from "react";
import { useSelector } from "react-redux";
import { selectPlayableMask, selectRules } from "@/state/game/gameSlice";
import type { RootState } from "@/state/reduxStore";

type DragSource =
  | { type: "foundation"; index: number }
  | { type: "tableau"; colIndex: number; startIndex: number }
  | { type: "freecell"; index: number };

type DragState = {
  active: boolean;
  pending: boolean;
  isReturning: boolean;
  source: DragSource | null;
};

export function usePointerControlSystem() {
  const playable = useSelector(selectPlayableMask);
  const rules = useSelector(selectRules);
  const foundations = useSelector(
    (state: RootState) => state.game.history.present.foundations
  );

  const [drag, setDrag] = useState<DragState>({
    active: false,
    pending: false,
    isReturning: false,
    source: null
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
      source: { type: "foundation", index }
    });
  };

  return {
    drag,
    setDrag,
    handleFoundationPointerDown
  };
}
