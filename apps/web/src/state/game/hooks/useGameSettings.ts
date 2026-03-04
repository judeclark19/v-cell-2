import { useEffect, useState } from "react";
import type { UndoLimit, FaceDownCount } from "@vcell/engine";
import { useSelector } from "react-redux";
import { selectFaceDownCount } from "..";

const SHOW_TIMER_KEY = "vcell:showTimer";
const UNDO_LIMIT_KEY = "vcell:undoLimit";
const FACE_DOWN_COUNT_KEY = "vcell:faceDownCount";

export type UseGameSettingsResult = {
  showTimer: boolean;
  setShowTimer: (next: boolean) => void;
  undoLimit: UndoLimit;
  setUndoLimit: (next: UndoLimit) => void;
};

export function useGameSettings(): UseGameSettingsResult {
  const [showTimer, setShowTimer] = useState<boolean>(true);

  const [undoLimit, setUndoLimit] = useState<UndoLimit>("unlimited");

  // const [faceDownCount, setFaceDownCount] = useState<Rules["faceDownCount"]>(7);

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Load persisted settings on the client after hydration.
    // Defer setState to a microtask to avoid "setState synchronously within an effect" warnings.
    try {
      let nextShowTimer: boolean | null = null;
      let nextUndoLimit: UndoLimit | null = null;
      let nextFaceDownCount: FaceDownCount | null = null;

      const rawShowTimer = window.localStorage.getItem(SHOW_TIMER_KEY);
      if (rawShowTimer != null) {
        nextShowTimer = rawShowTimer === "true";
      }

      const rawUndo = window.localStorage.getItem(UNDO_LIMIT_KEY);
      if (rawUndo != null) {
        if (rawUndo === "unlimited") {
          nextUndoLimit = "unlimited";
        } else {
          const n = Number(rawUndo);
          if (n === 0 || n === 1 || n === 3 || n === 5) {
            nextUndoLimit = n as UndoLimit;
          }
        }
      }

      const rawFaceDown = window.localStorage.getItem(FACE_DOWN_COUNT_KEY);
      if (rawFaceDown != null) {
        const n = Number(rawFaceDown);
        if (n === 0 || n === 7 || n === 14 || n === 21) {
          nextFaceDownCount = n;
        }
      }

      // If nothing to apply, mark hydrated and bail.
      if (
        nextShowTimer == null &&
        nextUndoLimit == null &&
        nextFaceDownCount == null
      ) {
        queueMicrotask(() => {
          setHydrated(true);
        });
        return;
      }

      queueMicrotask(() => {
        if (nextShowTimer != null) {
          setShowTimer(nextShowTimer);
        }
        if (nextUndoLimit != null) {
          setUndoLimit(nextUndoLimit);
        }
        // if (nextFaceDownCount != null) {
        //   setFaceDownCount(nextFaceDownCount);
        // }
        setHydrated(true);
      });
    } catch {
      // Ignore storage errors (private mode, blocked storage, etc.)
      queueMicrotask(() => {
        setHydrated(true);
      });
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(SHOW_TIMER_KEY, String(showTimer));
  }, [hydrated, showTimer]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(UNDO_LIMIT_KEY, String(undoLimit));
  }, [hydrated, undoLimit]);
  const faceDownCount = useSelector(selectFaceDownCount);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(FACE_DOWN_COUNT_KEY, String(faceDownCount));
  }, [hydrated, faceDownCount]);

  return {
    showTimer,
    setShowTimer,
    undoLimit,
    setUndoLimit
  };
}
