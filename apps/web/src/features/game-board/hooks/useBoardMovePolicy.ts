import { Move } from "@vcell/engine";
import { useCallback, useEffect, useRef } from "react";

export type UseBoardMovePolicyArgs<TDropArgs extends unknown[]> = {
  /** Lower-level drop commit function (from useBoardDrop) */
  onDrop: (...args: TDropArgs) => boolean;

  /** Dispatch a move directly (keyboard-driven). */
  dispatchMove: (move: Move) => void;

  /** Mark FLIP suppression for the next animation cycle (from useNoFlipResets) */
  suppressFlipOnceNext: () => void;

  /** Reset confetti/celebration tracking */
  clearCelebration: () => void;

  /** New deal action that already applies the no-FLIP policy (from Board/useNoFlipResets wiring) */
  newDealNoFlip: () => void;

  /** Restart action that already applies the no-FLIP policy (from Board/useNoFlipResets wiring) */
  restartNoFlip: () => void;

  /** True when the current deal is won */
  isWon: boolean;

  /** Current seed (used when replaying the same seed) */
  seed: string;

  /** Optional: start a new session with the same seed (new gameId). */
  replaceSeed?: (seed: string) => void;
};

export type UseBoardMovePolicyResult<TDropArgs extends unknown[]> = {
  /** Commit a keyboard-driven move. Does NOT suppress FLIP. */
  commitMoveFromKeyboard: (move: Move) => void;

  /** Commit a pointer-drag drop. Suppresses FLIP once when it commits. */
  commitMoveFromPointerDrop: (...args: TDropArgs) => boolean;

  /** New deal (always new seed) with celebration reset. */
  newDealWithCelebration: () => void;

  /** Restart with celebration reset. If won and replaceSeed is provided, replay same seed with new gameId. */
  restartWithCelebration: () => void;

  /** Replay the current seed with a new gameId (only available when replaceSeed is provided). */
  replaySeedWithCelebration: () => void;
};

/**
 * Board-level policy layer that unifies move commits and reset behaviors.
 *
 * Keeps Board.tsx from owning:
 * - pointer vs keyboard commit policy
 * - FLIP suppression plumbing
 * - celebration reset wrappers
 */
export function useBoardMovePolicy<TDropArgs extends unknown[]>({
  onDrop,
  dispatchMove,
  suppressFlipOnceNext,
  clearCelebration,
  newDealNoFlip,
  restartNoFlip,
  isWon,
  seed,
  replaceSeed
}: UseBoardMovePolicyArgs<TDropArgs>): UseBoardMovePolicyResult<TDropArgs> {
  const suppressFlipOnceNextRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    suppressFlipOnceNextRef.current = suppressFlipOnceNext;
  }, [suppressFlipOnceNext]);

  const commitMoveFromKeyboard = useCallback(
    (move: Move) => {
      dispatchMove(move);
    },
    [dispatchMove]
  );

  const commitMoveFromPointerDrop = useCallback(
    (...args: TDropArgs) => {
      const didCommit = onDrop(...args);
      // Pointer drag already provided its own visual motion via the drag overlay.
      // Skip FLIP once so we don't double-animate.
      if (didCommit) suppressFlipOnceNextRef.current?.();
      return didCommit;
    },
    [onDrop]
  );

  const newDealWithCelebration = useCallback(() => {
    clearCelebration();
    newDealNoFlip();
  }, [clearCelebration, newDealNoFlip]);

  const replaySeedWithCelebration = useCallback(() => {
    if (!replaceSeed) return;
    clearCelebration();
    replaceSeed(seed);
  }, [clearCelebration, replaceSeed, seed]);

  const restartWithCelebration = useCallback(() => {
    // After a win, "restart" means "replay this deal" (same seed, new gameId),
    // if the engine provides that action.
    if (isWon && replaceSeed) {
      replaySeedWithCelebration();
      return;
    }

    clearCelebration();
    restartNoFlip();
  }, [
    isWon,
    replaceSeed,
    replaySeedWithCelebration,
    clearCelebration,
    restartNoFlip
  ]);

  return {
    commitMoveFromKeyboard,
    commitMoveFromPointerDrop,
    newDealWithCelebration,
    restartWithCelebration,
    replaySeedWithCelebration
  };
}
