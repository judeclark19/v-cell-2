import { useCallback } from "react";
import { Move, TableauIndex } from "@vcell/engine";
import type {
  DropTarget,
  DragState
} from "@/features/game-board/animations/dragTypes";
import { useSelector } from "react-redux";
import { selectLegalMoves } from "@/state/game/gameSlice";

type UseBoardDropArgs = {
  dispatchMove: (move: Move) => void;
};

type OnDropArgs<TCardItem> = {
  clientX: number;
  clientY: number;
  drag: DragState<TCardItem>;
  dropTarget: DropTarget;
};

type TableauStackMove = Extract<Move, { kind: "tableauStack" }>;

type HasKind = { kind?: string };

function isTableauStackMove(m: Move): m is TableauStackMove {
  return (m as HasKind).kind === "tableauStack";
}

type DragLike<TCardItem> = Pick<DragState<TCardItem>, "source" | "stack">;

type CommitBoardDropArgs<TCardItem> = {
  drag: DragLike<TCardItem>;
  dropTarget: DropTarget;
  legalMoves: Move[];
  dispatchMove: (move: Move) => void;
};

/**
 * Pure (non-hook) version of the board drop policy.
 * Useful for keyboard-driven drops where we have a source + stack + dropTarget,
 * but no pointer coordinates.
 */
export function commitBoardDrop<TCardItem>({
  drag,
  dropTarget,
  legalMoves,
  dispatchMove
}: CommitBoardDropArgs<TCardItem>) {
  // Allow tableau stack drops onto tableau. Other targets remain single-card only.
  if (drag.stack.length < 1) return false;
  if (!drag.source) return false;
  if (!dropTarget) return false;

  const source = drag.source;
  const fromTableauIndex =
    source.type === "tableau" ? (source.colIndex as TableauIndex) : null;

  if (dropTarget.type === "tableau") {
    const toIndex = dropTarget.colIndex as TableauIndex;

    // 1) Multi-card stack drag: tableau -> tableau
    if (
      source.type === "tableau" &&
      fromTableauIndex != null &&
      drag.stack.length > 1
    ) {
      if (toIndex === source.colIndex) return false;

      const startIndex = source.startIndex;

      // Engine represents stack moves as a distinct kind.
      // Match by shape to avoid over-constraining types.
      const stackMove = legalMoves.find((m): m is TableauStackMove => {
        if (!isTableauStackMove(m)) return false;

        return (
          m.from.type === "tableau" &&
          m.to.type === "tableau" &&
          m.from.index === fromTableauIndex &&
          m.to.index === toIndex &&
          m.startIndex === startIndex
        );
      });

      if (!stackMove) return false;
      dispatchMove(stackMove);
      return true;
    }

    // 2) Single-card drag: tableau -> tableau
    if (source.type === "tableau" && fromTableauIndex != null) {
      if (toIndex === source.colIndex) return false;

      const move = legalMoves.find(
        (m): m is Extract<Move, { kind: "single" }> =>
          m.kind === "single" &&
          m.from.type === "tableau" &&
          m.to.type === "tableau" &&
          m.from.index === fromTableauIndex &&
          m.to.index === toIndex
      );

      if (!move) return false;
      dispatchMove(move);
      return true;
    }

    // 3) Single-card drag: freecell -> tableau
    if (source.type === "freecell") {
      const fromIndex = source.index;

      const move = legalMoves.find(
        (m): m is Extract<Move, { kind: "single" }> =>
          m.kind === "single" &&
          m.from.type === "freecell" &&
          m.to.type === "tableau" &&
          m.from.index === fromIndex &&
          m.to.index === toIndex
      );

      if (!move) return false;
      dispatchMove(move);
      return true;
    }

    // foundation -> tableau (single only)
    if (source.type === "foundation") {
      const fromIndex = source.index;

      const move = legalMoves.find(
        (m): m is Extract<Move, { kind: "single" }> =>
          m.kind === "single" &&
          m.from.type === "foundation" &&
          m.to.type === "tableau" &&
          m.from.index === fromIndex &&
          m.to.index === toIndex
      );

      if (!move) return false;
      dispatchMove(move);
      return true;
    }

    return false;
  }

  // tableau/foundation -> freecell (single only)
  if (dropTarget.type === "freecell") {
    if (drag.stack.length !== 1) return false;
    const toIndex = dropTarget.index;

    // tableau -> freecell
    if (source.type === "tableau" && fromTableauIndex != null) {
      const move = legalMoves.find(
        (m): m is Extract<Move, { kind: "single" }> =>
          m.kind === "single" &&
          m.from.type === "tableau" &&
          m.to.type === "freecell" &&
          m.from.index === fromTableauIndex &&
          m.to.index === toIndex
      );

      if (!move) return false;
      dispatchMove(move);
      return true;
    }

    // foundation -> freecell
    if (source.type === "foundation") {
      const fromIndex = source.index;

      const move = legalMoves.find(
        (m): m is Extract<Move, { kind: "single" }> =>
          m.kind === "single" &&
          m.from.type === "foundation" &&
          m.to.type === "freecell" &&
          m.from.index === fromIndex &&
          m.to.index === toIndex
      );

      if (!move) return false;
      dispatchMove(move);
      return true;
    }

    // freecell -> freecell
    if (source.type === "freecell") {
      const fromIndex = source.index;
      if (fromIndex === toIndex) return false;

      const move = legalMoves.find(
        (m): m is Extract<Move, { kind: "single" }> =>
          m.kind === "single" &&
          m.from.type === "freecell" &&
          m.to.type === "freecell" &&
          m.from.index === fromIndex &&
          m.to.index === toIndex
      );

      if (!move) return false;
      dispatchMove(move);
      return true;
    }

    return false;
  }

  // tableau/freecell/foundation -> foundation (single only)
  if (dropTarget.type === "foundation") {
    if (drag.stack.length !== 1) return false;
    const toIndex = dropTarget.index;

    if (source.type === "tableau" && fromTableauIndex != null) {
      const move = legalMoves.find(
        (m): m is Extract<Move, { kind: "single" }> =>
          m.kind === "single" &&
          m.from.type === "tableau" &&
          m.to.type === "foundation" &&
          m.from.index === fromTableauIndex &&
          m.to.index === toIndex
      );

      if (!move) return false;
      dispatchMove(move);
      return true;
    }

    if (source.type === "freecell") {
      const fromIndex = source.index;

      const move = legalMoves.find(
        (m): m is Extract<Move, { kind: "single" }> =>
          m.kind === "single" &&
          m.from.type === "freecell" &&
          m.to.type === "foundation" &&
          m.from.index === fromIndex &&
          m.to.index === toIndex
      );

      if (!move) return false;
      dispatchMove(move);
      return true;
    }

    if (source.type === "foundation") {
      const fromIndex = source.index;
      if (fromIndex === toIndex) return false;

      const move = legalMoves.find(
        (m): m is Extract<Move, { kind: "single" }> =>
          m.kind === "single" &&
          m.from.type === "foundation" &&
          m.to.type === "foundation" &&
          m.from.index === fromIndex &&
          m.to.index === toIndex
      );

      if (!move) return false;
      dispatchMove(move);
      return true;
    }

    return false;
  }

  return false;
}

/**
 * Produces the `onDrop` handler for `useCardDrag`, based on engine legalMoves.
 * \n
 * Policy:\n
 * - tableau -> tableau: allow single-card and stack moves\n
 * - tableau/freecell -> foundation: single-card only\n
 * - tableau -> freecell: single-card only\n
 */
export function useBoardDrop({ dispatchMove }: UseBoardDropArgs) {
  // Game state
  const legalMoves = useSelector(selectLegalMoves);

  return useCallback(
    <TCardItem>({ drag, dropTarget }: OnDropArgs<TCardItem>) => {
      return commitBoardDrop({
        drag,
        dropTarget,
        legalMoves,
        dispatchMove
      });
    },
    [dispatchMove, legalMoves]
  );
}
