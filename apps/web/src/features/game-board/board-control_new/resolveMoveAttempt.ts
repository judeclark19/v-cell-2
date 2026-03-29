import type {
  Move,
  PileRef,
  TableauIndex,
  FreeCellIndex,
  FoundationIndex
} from "@vcell/engine";
import { DragState } from "./pointer-control/dragState";
import { BoardSource } from "./useBoardControlSystem";

export const resolveBoardSourceFromEl = (
  el: HTMLElement
): BoardSource | null => {
  const region = el.dataset.region;
  const indexRaw = el.dataset.regionIndex;

  if (!region || indexRaw == null) return null;

  const index = Number(indexRaw);
  if (Number.isNaN(index)) return null;

  if (region === "tableau") {
    const startIndexRaw = el.dataset.positionInStack;
    if (startIndexRaw == null) return null;

    const startIndex = Number(startIndexRaw);
    if (Number.isNaN(startIndex)) return null;

    return { type: "tableau", index, startIndex };
  }

  if (region === "freecell") {
    return { type: "freecell", index };
  }

  if (region === "foundation") {
    return { type: "foundation", index };
  }

  return null;
};

export const getPileRefFromDropTarget = (
  dropTarget: HTMLElement
): PileRef | null => {
  if (
    !dropTarget ||
    !dropTarget.dataset.region ||
    !dropTarget.dataset.regionIndex
  )
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

type MoveResolutionArgs = {
  source: BoardSource | null;
  stackLength: number;
  dropPileRef: PileRef | null;
  legalMoves: Move[];
};

export function resolveMoveAttempt({
  source,
  stackLength,
  dropPileRef,
  legalMoves
}: MoveResolutionArgs): Move | null {
  if (!source || !dropPileRef) return null;

  if (
    source.type === "tableau" &&
    dropPileRef.type === "tableau" &&
    stackLength > 1
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
}
