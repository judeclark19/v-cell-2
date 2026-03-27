import type {
  Move,
  PileRef,
  TableauIndex,
  FreeCellIndex,
  FoundationIndex
} from "@vcell/engine";
import { DragState } from "./pointer-control/dragState";

export const getPileRefFromDropTarget = (
  dropTarget: HTMLElement
): PileRef | null => {
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

export const resolveDropMove = (
  drag: DragState,
  dropPileRef: PileRef | null,
  legalMoves: Move[]
): Move | null => {
  if (!drag.source || !dropPileRef) return null;

  const source = drag.source;

  // Multi-card tableau drag onto tableau
  if (
    source.type === "tableau" &&
    dropPileRef.type === "tableau" &&
    drag.stack.length > 1
  ) {
    return (
      legalMoves.find(
        (m) =>
          m.kind === "tableauStack" &&
          m.from.index === source.index &&
          m.startIndex === source.startIndex &&
          m.to.index === dropPileRef.index
      ) ?? null
    );
  }

  // Everything else is a single-card move
  return (
    legalMoves.find(
      (m) =>
        m.kind === "single" &&
        m.from.type === source.type &&
        m.from.index === source.index &&
        m.to.type === dropPileRef.type &&
        m.to.index === dropPileRef.index
    ) ?? null
  );
};
