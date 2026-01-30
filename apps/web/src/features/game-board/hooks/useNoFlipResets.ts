import { useCallback, useRef, useState } from "react";

/**
 * Encapsulates the policy for suppressing FLIP animations exactly once
 * after certain board-resetting actions (new deal, restart, pointer drag commit).
 *
 * Board owns *when* these policies are invoked; this hook owns *how* they work.
 */
export type UseNoFlipResetsArgs = {
  /** Start a brand new deal (engine action) */
  newDeal: () => void;

  /** Restart the current deal (engine action) */
  restart: () => void;

  /** Ref that can stop an in-progress auto-complete sequence */
  stopAutoCompleteRef: React.RefObject<(() => void) | null>;

  /** Clear dismissed win state on reset */
  clearDismissedWinSeed: () => void;
};

export function useNoFlipResets({
  newDeal,
  restart,
  stopAutoCompleteRef,
  clearDismissedWinSeed
}: UseNoFlipResetsArgs) {
  /**
   * Previous card rects used by FLIP.
   * Clearing this prevents animations on the next render.
   */
  const prevCardRectsRef = useRef<Map<string, DOMRect>>(new Map());

  /**
   * One-shot flag: when true, the *next* FLIP animation is skipped.
   */
  const [suppressFlipOnce, setSuppressFlipOnce] = useState(false);

  /**
   * Consume the suppression flag exactly once.
   */
  const consumeSuppressFlipOnce = useCallback(() => {
    if (suppressFlipOnce) {
      setSuppressFlipOnce(false);
      return true;
    }
    return false;
  }, [suppressFlipOnce]);

  const suppressFlipOnceNext = useCallback(() => {
    setSuppressFlipOnce(true);
  }, []);

  /**
   * Start a new deal without animating card movement.
   */
  const newDealNoFlip = useCallback(() => {
    setSuppressFlipOnce(true);
    prevCardRectsRef.current.clear();

    stopAutoCompleteRef.current?.();

    clearDismissedWinSeed();

    newDeal();
  }, [newDeal, stopAutoCompleteRef, clearDismissedWinSeed]);

  /**
   * Restart the current deal without animating card movement.
   */
  const restartNoFlip = useCallback(() => {
    setSuppressFlipOnce(true);
    prevCardRectsRef.current.clear();

    stopAutoCompleteRef.current?.();

    clearDismissedWinSeed();

    restart();
  }, [restart, stopAutoCompleteRef, clearDismissedWinSeed]);

  return {
    prevCardRectsRef,
    consumeSuppressFlipOnce,
    newDealNoFlip,
    restartNoFlip,
    suppressFlipOnceNext
  };
}
