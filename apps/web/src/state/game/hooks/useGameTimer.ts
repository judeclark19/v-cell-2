import { selectSessionPhase, selectStartedAtMs } from "@/state/session";
import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { selectPaused, selectStatus } from "..";

export type UseGameTimerParams = {
  setTimeElapsedMs: React.Dispatch<React.SetStateAction<number>>;
};

/**
 * Drives the game timer while the game is active and the tab is visible.
 *
 * - Uses `performance.now()` for stable deltas.
 * - Stops on win/abandon.
 * - Pauses when document is hidden.
 */
export function useGameTimer({ setTimeElapsedMs }: UseGameTimerParams) {
  const intervalIdRef = useRef<number | null>(null);
  const lastTickAtRef = useRef<number | null>(null);
  const startedAtMs = useSelector(selectStartedAtMs);
  const status = useSelector(selectStatus);
  const paused = useSelector(selectPaused);
  const sessionPhase = useSelector(selectSessionPhase);

  useEffect(() => {
    const isFinished = status === "won" || status === "abandoned";

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
        sessionPhase === "ready" &&
        startedAtMs
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
        sessionPhase === "ready" &&
        startedAtMs
      ) {
        startTimerInterval();
      }
    }

    if (
      !paused &&
      !isFinished &&
      sessionPhase === "ready" &&
      startedAtMs &&
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
  }, [paused, sessionPhase, setTimeElapsedMs, startedAtMs, status]);
}
