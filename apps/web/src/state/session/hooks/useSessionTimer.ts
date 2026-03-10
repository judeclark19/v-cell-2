import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectStatus } from "../../game/gameSlice";
import {
  selectSessionPhase,
  selectPaused,
  selectStartedAtMs,
  selectTimeElapsedMs,
  setTimeElapsedMs
} from "@/state/session/sessionSlice";
import { upsertInProgressGame } from "@/persistence/inProgressGamesStore";

/**
 * Drives the game timer while the game is active and the tab is visible.
 *
 * - Uses `performance.now()` for stable deltas.
 * - Stops on win/abandon.
 * - Pauses when document is hidden.
 */
export function useSessionTimer() {
  const dispatch = useDispatch();

  const intervalIdRef = useRef<number | null>(null);
  const lastTickAtRef = useRef<number | null>(null);
  const startedAtMs = useSelector(selectStartedAtMs);
  const status = useSelector(selectStatus);
  const paused = useSelector(selectPaused);
  const sessionPhase = useSelector(selectSessionPhase);
  const timeElapsedMs = useSelector(selectTimeElapsedMs);

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
          dispatch(setTimeElapsedMs(timeElapsedMs + deltaMs));
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
  }, [paused, sessionPhase, startedAtMs, status, dispatch, timeElapsedMs]);
}
