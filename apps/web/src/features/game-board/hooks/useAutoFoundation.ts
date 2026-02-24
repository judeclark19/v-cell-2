import { useCallback } from "react";
import type { Move, PileRef } from "@vcell/engine";

type UseAutoFoundationArgs = {
  legalMoves: Move[];
  dispatchMove: (move: Move) => void;
};

/**
 * Returns a callback that auto-moves a single card from the given pile to a
 * foundation slot, deterministically picking the lowest foundation index.
 */
export function useAutoFoundation({
  legalMoves,
  dispatchMove
}: UseAutoFoundationArgs) {
  return useCallback(
    (from: PileRef) => {
      const candidates = legalMoves.filter(
        (m): m is Extract<Move, { kind: "single" }> => {
          if (m.kind !== "single") return false;
          if (m.from.type !== from.type) return false;
          if (m.to.type !== "foundation") return false;

          // Most sources have an index, but PileRef is a union so we guard.
          if (!("index" in m.from) || !("index" in from)) return false;
          return m.from.index === from.index;
        }
      );

      if (candidates.length === 0) return false;

      // Deterministic choice: lowest foundation index.
      candidates.sort((a, b) => a.to.index - b.to.index);
      dispatchMove(candidates[0]);
      return true;
    },
    [dispatchMove, legalMoves]
  );
}
