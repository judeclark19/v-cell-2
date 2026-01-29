import { useCallback, useRef } from "react";

/**
 * Coordinates "wait until FLIP animation completes" semantics without
 * forcing Board.tsx to manage resolver refs inline.
 */
export function useFlipSequencer() {
  // Resolver for a pending "wait for flip" promise
  const flipDoneResolverRef = useRef<(() => void) | null>(null);

  /**
   * Returns a promise that resolves the next time `onFlipComplete` is called.
   * If no flip is in progress, the promise resolves immediately.
   */
  const waitForFlipComplete = useCallback(() => {
    if (flipDoneResolverRef.current) {
      return new Promise<void>((resolve) => {
        flipDoneResolverRef.current = resolve;
      });
    }
    return Promise.resolve();
  }, []);

  /**
   * Signals that the current FLIP animation cycle has completed.
   * Safe to call even if nobody is waiting.
   */
  const onFlipComplete = useCallback(() => {
    const resolve = flipDoneResolverRef.current;
    flipDoneResolverRef.current = null;
    resolve?.();
  }, []);

  return {
    waitForFlipComplete,
    onFlipComplete
  };
}
