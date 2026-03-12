import { useCallback } from "react";
import type { PileRef } from "@vcell/engine";
import { Move } from "@vcell/engine";

/**
 * Deterministic "auto" placement into free cells.
 *
 * Chooses the lowest-index free cell slot that is legal for the given pile ref.
 * (Legal moves are provided by the engine; this hook just selects one deterministically.)
 */
export function useAutoFreeCell(args: {
  legalMoves: Move[];
  makeMove: (m: Move) => void;
}) {
  const { legalMoves, makeMove } = args;

  return useCallback(
    (from: PileRef) => {
      const candidates = legalMoves
        .filter((m) => {
          if (m.kind !== "single") return false;
          if (m.to.type !== "freecell") return false;

          // Match the move's source to the provided pile ref.
          if (from.type === "tableau") {
            return m.from.type === "tableau" && m.from.index === from.index;
          }

          // Freecell / foundation / other indexed piles.
          if ("index" in from) {
            return (
              m.from.type === from.type &&
              "index" in m.from &&
              m.from.index === from.index
            );
          }

          return false;
        })
        .sort((a, b) => a.to.index - b.to.index);

      const move = candidates[0];
      if (!move) return false;

      makeMove(move);
      return true;
    },
    [makeMove, legalMoves]
  );
}
