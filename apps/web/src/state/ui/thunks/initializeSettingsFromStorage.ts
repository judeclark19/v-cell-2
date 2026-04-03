import { createAsyncThunk } from "@reduxjs/toolkit";
import type { FaceDownCount, UndoLimit } from "@vcell/engine";
import type { AppDispatch, RootState } from "@/state/reduxStore";
import {
  setAllowFoundationPullbackRule,
  setFaceDownCountRule,
  setUndoLimitRule
} from "@/state/game/gameSlice";
import { setSettingsHydrated, setShowTimer } from "@/state/ui/uiSlice";
import {
  SHOW_TIMER_KEY,
  UNDO_LIMIT_KEY,
  FACE_DOWN_COUNT_KEY,
  ALLOW_FOUNDATION_PULLBACK_KEY
} from "../settingsListeners";

export const initializeSettingsFromStorage = createAsyncThunk<
  void,
  void,
  { state: RootState; dispatch: AppDispatch }
>("ui/initializeSettingsFromStorage", async (_, thunkApi) => {
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

    const rawAllowFoundationPullback = window.localStorage.getItem(
      ALLOW_FOUNDATION_PULLBACK_KEY
    );
    if (rawAllowFoundationPullback != null) {
      const allowFoundationPullback = rawAllowFoundationPullback === "true";
      thunkApi.dispatch(
        setAllowFoundationPullbackRule(allowFoundationPullback)
      );
    }

    if (nextShowTimer != null) {
      thunkApi.dispatch(setShowTimer(nextShowTimer));
    }
    if (nextUndoLimit != null) {
      thunkApi.dispatch(setUndoLimitRule(nextUndoLimit));
    }
    if (nextFaceDownCount != null) {
      thunkApi.dispatch(setFaceDownCountRule(nextFaceDownCount));
    }

    thunkApi.dispatch(setSettingsHydrated(true));
  } catch {
    // Ignore storage errors
    thunkApi.dispatch(setSettingsHydrated(true));
  }
});
