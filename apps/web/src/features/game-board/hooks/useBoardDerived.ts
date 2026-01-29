import { useMemo } from "react";
import { getLegalMoves, getPlayableMask, type GameState } from "@vcell/engine";

export function useBoardDerived(state: GameState) {
  const playable = useMemo(() => getPlayableMask(state), [state]);

  const legalMoves = useMemo(() => getLegalMoves(state), [state]);

  const foundationCount = useMemo(() => {
    return state.foundations.reduce((sum, pile) => sum + pile.cards.length, 0);
  }, [state.foundations]);

  const isFullyCollected = foundationCount === 52;

  return { playable, legalMoves, foundationCount, isFullyCollected };
}
