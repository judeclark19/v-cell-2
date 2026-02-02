import { useEffect, useState } from "react";
import type { Rules, UndoLimit } from "@vcell/engine";

const SHOW_TIMER_KEY = "vcell:showTimer";
const UNDO_LIMIT_KEY = "vcell:undoLimit";
const FACE_DOWN_COUNT_KEY = "vcell:faceDownCount";

export type UseGameSettingsResult = {
  showTimer: boolean;
  setShowTimer: (next: boolean) => void;
  undoLimit: UndoLimit;
  setUndoLimit: (next: UndoLimit) => void;
  faceDownCount: Rules["faceDownCount"];
  setFaceDownCount: (next: Rules["faceDownCount"]) => void;
};

export function useGameSettings(): UseGameSettingsResult {
  const [showTimer, setShowTimer] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const raw = window.localStorage.getItem(SHOW_TIMER_KEY);
    if (raw == null) return true;
    return raw === "true";
  });

  const [undoLimit, setUndoLimit] = useState<UndoLimit>(() => {
    // SSR-safe default to avoid hydration mismatch.
    if (typeof window === "undefined") return "unlimited";
    const raw = window.localStorage.getItem(UNDO_LIMIT_KEY);
    if (raw == null) return "unlimited";
    if (raw === "unlimited") return "unlimited";
    const n = Number(raw);
    if (n === 0 || n === 1 || n === 3 || n === 5) return n as UndoLimit;
    return "unlimited";
  });

  const [faceDownCount, setFaceDownCount] = useState<Rules["faceDownCount"]>(
    () => {
      // SSR-safe default to avoid hydration mismatch.
      if (typeof window === "undefined") return 7;
      const raw = window.localStorage.getItem(FACE_DOWN_COUNT_KEY);
      if (raw == null) return 7;
      const n = Number(raw);
      if (n === 0 || n === 7 || n === 14 || n === 21) return n;
      return 7;
    }
  );

  useEffect(() => {
    window.localStorage.setItem(SHOW_TIMER_KEY, String(showTimer));
  }, [showTimer]);

  useEffect(() => {
    window.localStorage.setItem(UNDO_LIMIT_KEY, String(undoLimit));
  }, [undoLimit]);

  useEffect(() => {
    window.localStorage.setItem(FACE_DOWN_COUNT_KEY, String(faceDownCount));
  }, [faceDownCount]);

  return {
    showTimer,
    setShowTimer,
    undoLimit,
    setUndoLimit,
    faceDownCount,
    setFaceDownCount
  };
}
