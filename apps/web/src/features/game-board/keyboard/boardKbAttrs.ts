import { createContext, useCallback, useMemo } from "react";

export type KbElementAttrs = { focusable: boolean; dropTarget: boolean };

export type BoardKbAttrsContextValue = {
  kbCarrying: boolean;
  /** Determine if a given card id is playable (not necessarily a legal move). */
  isPlayableCardId: (cardId: string) => boolean;
  /** Compute kb attrs for any element using the mapping layer. */
  getKbAttrsForEl: (el: HTMLElement) => KbElementAttrs | null;
};

export const BoardKbAttrsContext =
  createContext<BoardKbAttrsContextValue | null>(null);

// Minimal structural types so this module stays decoupled from the engine.
// Board will pass the real `state` + `playable` objects.
export type BoardKbStateLike = {
  tableau: Array<Array<{ card: { id: string } }>>;
  freeCells: Array<{ id: string } | null>;
  foundations: Array<{ cards: Array<{ id: string }> }>;
};

export type BoardPlayableMaskLike = {
  tableau: boolean[][];
  freeCells: boolean[];
  foundations: boolean[];
};

export type GetKbAttrsForElCore = (
  el: HTMLElement,
  ctx: {
    kbCarrying: boolean;
    isPlayableCardId: (cardId: string) => boolean;
    isLegalDropTargetEl: (el: HTMLElement) => boolean;
  }
) => KbElementAttrs | null;

export type UseBoardKbAttrsArgs = {
  kbCarrying: boolean;
  state: BoardKbStateLike;
  playable: BoardPlayableMaskLike;
  /** Pure helper from dom mapping: decides attrs for a given element + context. */
  getKbAttrsForElCore: GetKbAttrsForElCore;
  /** Stable predicate used to declare legal drop targets. */
  isLegalDropTargetEl: (el: HTMLElement) => boolean;
};

export function useBoardKbAttrs({
  kbCarrying,
  state,
  playable,
  getKbAttrsForElCore,
  isLegalDropTargetEl
}: UseBoardKbAttrsArgs) {
  const playableCardIdSet = useMemo(() => {
    const ids = new Set<string>();

    // Tableau
    for (let col = 0; col < state.tableau.length; col++) {
      const column = state.tableau[col];
      const colMask = playable.tableau[col] ?? [];
      for (let row = 0; row < column.length; row++) {
        if (colMask[row]) {
          const id = column[row]?.card?.id;
          if (id) ids.add(id);
        }
      }
    }

    // Free cells
    for (let i = 0; i < state.freeCells.length; i++) {
      if (playable.freeCells[i]) {
        const id = state.freeCells[i]?.id;
        if (id) ids.add(id);
      }
    }

    // Foundations
    for (let i = 0; i < state.foundations.length; i++) {
      if (playable.foundations[i]) {
        const pile = state.foundations[i];
        const top = pile.cards[pile.cards.length - 1];
        const id = top?.id;
        if (id) ids.add(id);
      }
    }

    return ids;
  }, [state, playable]);

  const isPlayableCardId = useCallback(
    (cardId: string) => playableCardIdSet.has(cardId),
    [playableCardIdSet]
  );

  const getKbAttrsForElement = useCallback(
    (el: HTMLElement) => {
      return getKbAttrsForElCore(el, {
        kbCarrying,
        isPlayableCardId,
        isLegalDropTargetEl
      });
    },
    [getKbAttrsForElCore, kbCarrying, isPlayableCardId, isLegalDropTargetEl]
  );

  const kbAttrsContextValue = useMemo<BoardKbAttrsContextValue>(
    () => ({
      kbCarrying,
      isPlayableCardId,
      getKbAttrsForEl: getKbAttrsForElement
    }),
    [kbCarrying, isPlayableCardId, getKbAttrsForElement]
  );

  return {
    isPlayableCardId,
    getKbAttrsForElement,
    kbAttrsContextValue
  };
}
