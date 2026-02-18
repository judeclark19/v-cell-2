import { useEffect, useRef } from "react";

export type UseGameTimerParams = {
  paused: boolean;
  seedReady: boolean;
  hasStarted: boolean;
  isWon: boolean;
  isAbandoned: boolean;
  setTimeElapsedMs: React.Dispatch<React.SetStateAction<number>>;
};

/**
 * Drives the game timer while the game is active and the tab is visible.
 *
 * - Uses `performance.now()` for stable deltas.
 * - Stops on win/abandon.
 * - Pauses when document is hidden.
 */
export function useGameTimer({
  paused,
  seedReady,
  hasStarted,
  isWon,
  isAbandoned,
  setTimeElapsedMs
}: UseGameTimerParams) {
  const intervalIdRef = useRef<number | null>(null);
  const lastTickAtRef = useRef<number | null>(null);

  useEffect(() => {
    const isFinished = isWon || isAbandoned;

    function clearTimerInterval() {
      if (intervalIdRef.current !== null) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      lastTickAtRef.current = null;
    }

    function startTimerInterval() {
      if (intervalIdRef.current !== null) return;
      lastTickAtRef.current = performance.now();
      intervalIdRef.current = window.setInterval(() => {
        const now = performance.now();
        const lastTickAt = lastTickAtRef.current;
        const deltaMs = lastTickAt == null ? 0 : now - lastTickAt;

        if (lastTickAt != null) {
          setTimeElapsedMs((prev) => prev + deltaMs);
        }

        lastTickAtRef.current = now;
      }, 250);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        clearTimerInterval();
      } else if (
        document.visibilityState === "visible" &&
        document.hasFocus() &&
        !paused &&
        !isFinished &&
        seedReady &&
        hasStarted
      ) {
        startTimerInterval();
      }
    }

    function handleWindowBlur() {
      clearTimerInterval();
    }

    function handleWindowFocus() {
      if (
        document.visibilityState === "visible" &&
        document.hasFocus() &&
        !paused &&
        !isFinished &&
        seedReady &&
        hasStarted
      ) {
        startTimerInterval();
      }
    }

    if (
      !paused &&
      !isFinished &&
      seedReady &&
      hasStarted &&
      document.visibilityState === "visible" &&
      document.hasFocus()
    ) {
      startTimerInterval();
    }

    if (isFinished) {
      clearTimerInterval();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      clearTimerInterval();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [paused, seedReady, hasStarted, isWon, isAbandoned, setTimeElapsedMs]);
}
