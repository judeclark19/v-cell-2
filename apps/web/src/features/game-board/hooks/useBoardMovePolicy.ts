import { selectStatus } from "@/state/game/gameSlice";
import { Move } from "@vcell/engine";
import { useCallback, useEffect, useRef } from "react";
import { useSelector } from "react-redux";

export type UseBoardMovePolicyArgs<
  TOnDrop extends (...args: never[]) => boolean
> = {
  /** Lower-level drop commit function (from useBoardDrop) */
  onDrop: TOnDrop;

  /** Make a move directly (keyboard-driven). */
  makeMove: (move: Move) => void;

  /** Mark FLIP suppression for the next animation cycle (from useNoFlipResets) */
  suppressFlipOnceNext: () => void;

  /** Reset confetti/celebration tracking */
  clearCelebration: () => void;

  /** New deal action that already applies the no-FLIP policy (from Board/useNoFlipResets wiring) */
  newDealNoFlip: () => void;

  /** Restart action that already applies the no-FLIP policy (from Board/useNoFlipResets wiring) */
  restartNoFlip: () => void;

  /** Current seed (used when replaying the same seed) */
  seed: string;

  /** Optional: start a new session with the same seed (new sessionId). */
  replaySeed?: (seed: string) => void;
};

export type UseBoardMovePolicyResult<
  TOnDrop extends (...args: never[]) => boolean
> = {
  /** Commit a keyboard-driven move. Does NOT suppress FLIP. */
  commitMoveFromKeyboard: (move: Move) => void;

  /** Commit a pointer-drag drop. Suppresses FLIP once when it commits. */
  commitMoveFromPointerDrop: (...args: Parameters<TOnDrop>) => boolean;

  /** New deal (always new seed) with celebration reset. */
  newDealWithCelebration: () => void;

  /** Restart with celebration reset. If won and replaySeed is provided, replay same seed with new sessionId. */
  restartWithCelebration: () => void;

  /** Replay the current seed with a new sessionId (only available when replaySeed is provided). */
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
export function useBoardMovePolicy<
  TOnDrop extends (...args: never[]) => boolean
>({
  onDrop,
  makeMove,
  suppressFlipOnceNext,
  clearCelebration,
  newDealNoFlip,
  restartNoFlip,
  seed,
  replaySeed
}: UseBoardMovePolicyArgs<TOnDrop>): UseBoardMovePolicyResult<TOnDrop> {
  const suppressFlipOnceNextRef = useRef<(() => void) | null>(null);
  const status = useSelector(selectStatus);
  useEffect(() => {
    suppressFlipOnceNextRef.current = suppressFlipOnceNext;
  }, [suppressFlipOnceNext]);

  const commitMoveFromKeyboard = useCallback(
    (move: Move) => {
      makeMove(move);
    },
    [makeMove]
  );

  const commitMoveFromPointerDrop = useCallback(
    (...args: Parameters<TOnDrop>) => {
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
    if (!replaySeed) return;
    clearCelebration();
    replaySeed(seed);
  }, [clearCelebration, replaySeed, seed]);

  const restartWithCelebration = useCallback(() => {
    // After a win, "restart" means "replay this deal" (same seed, new sessionId),
    // if the engine provides that action.
    if (status === "won" && replaySeed) {
      replaySeedWithCelebration();
      return;
    }

    clearCelebration();
    restartNoFlip();
  }, [
    status,
    replaySeed,
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
