import { useCallback } from "react";
import { applyMove } from "@vcell/engine";
import type { DropTarget, DragState } from "@/ui/useCardDrag";

type Move = Parameters<typeof applyMove>[1];
type TableauIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type UseBoardDropArgs = {
  legalMoves: Move[];
  dispatchMove: (move: Move) => void;
};

type OnDropArgs<TCardItem> = {
  clientX: number;
  clientY: number;
  drag: DragState<TCardItem>;
  dropTarget: DropTarget;
};

/**
 * Produces the `onDrop` handler for `useCardDrag`, based on engine legalMoves.
 * \n
 * Policy:\n
 * - tableau -> tableau: allow single-card and stack moves\n
 * - tableau/freecell -> foundation: single-card only\n
 * - tableau -> freecell: single-card only\n
 */
export function useBoardDrop({ legalMoves, dispatchMove }: UseBoardDropArgs) {
  return useCallback(
    <TCardItem>({ drag, dropTarget }: OnDropArgs<TCardItem>) => {
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
          const stackMove = legalMoves.find(
            (m): m is Extract<Move, { kind: "tableauStack" }> =>
              (m as unknown as { kind?: string }).kind === "tableauStack" &&
              (m as any).from?.type === "tableau" &&
              (m as any).to?.type === "tableau" &&
              (m as any).from.index === fromTableauIndex &&
              (m as any).to.index === toIndex &&
              (m as any).startIndex === startIndex
          );

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

        return false;
      }

      // tableau -> freecell (single only)
      if (dropTarget.type === "freecell") {
        if (drag.stack.length !== 1) return false;
        if (source.type !== "tableau" || fromTableauIndex == null) return false;
        const toIndex = dropTarget.index;

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

      // tableau/freecell -> foundation (single only)
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

        return false;
      }

      return false;
    },
    [dispatchMove, legalMoves]
  );
}
