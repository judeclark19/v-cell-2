import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import { useFoundationDrainAutoComplete } from "@/features/game-board/hooks/useFoundationDrainAutoComplete";

export type UseBoardAutoCompleteArgs = {
  /** Whether the current seed/layout is ready for actions */
  seedReady: boolean;

  /** Whether the game is paused */
  paused: boolean;

  /** Whether any modal is open (win / pause / dev) */
  isAnyModalOpen: boolean;

  /** Whether the win modal is currently shown (suppresses auto-complete) */
  shouldShowWinModal: boolean;

  /** Drag state (used to suppress auto-complete during pointer interactions) */
  drag: {
    active: boolean;
    pending: boolean;
  };

  /** Refs to board regions needed by the underlying auto-complete hook */
  freeCellRefs: MutableRefObject<(HTMLDivElement | null)[]>;
  tableauColRefs: MutableRefObject<(HTMLDivElement | null)[]>;

  /** Attempts to auto-move from a given element into foundations */
  tryAutoFoundationFromEl: (el: HTMLElement) => boolean;

  /** Promise that resolves after FLIP animations complete */
  waitForFlipComplete: () => Promise<void>;
};

/**
 * Board-level orchestration for foundation auto-complete.
 *
 * This hook absorbs the ref-bridging and suppression logic so Board.tsx
 * doesn’t need to manage it inline.
 */
export function useBoardAutoComplete({
  seedReady,
  paused,
  isAnyModalOpen,
  shouldShowWinModal,
  drag,
  freeCellRefs,
  tableauColRefs,
  tryAutoFoundationFromEl,
  waitForFlipComplete
}: UseBoardAutoCompleteArgs) {
  const stopAutoCompleteRef = useRef<(() => void) | null>(null);

  const { isAutoCompleting, runAutoComplete, stopAutoComplete } =
    useFoundationDrainAutoComplete({
      seedReady,
      paused,
      isAnyModalOpen,
      shouldShowWinModal,
      drag,
      freeCellRefs,
      tableauColRefs,
      tryAutoFoundationFromEl,
      waitForFlipComplete
    });

  // Bridge the stop function through a ref so other policies (resets, etc.)
  // can cancel auto-complete without owning this hook’s internals.
  useEffect(() => {
    stopAutoCompleteRef.current = stopAutoComplete;
  }, [stopAutoComplete]);

  return {
    isAutoCompleting,
    runAutoComplete,
    stopAutoComplete,
    stopAutoCompleteRef
  };
}
