import { createListenerMiddleware } from "@reduxjs/toolkit";
import {
  setUndoLimitRule,
  setFaceDownCountRule,
  setAllowFoundationPullbackRule
} from "@/state/game/gameSlice";
import { setMotionPreference, setShowTimer } from "@/state/ui/uiSlice";
import type { MotionPreference } from "./motionPreference";
import { setPaused } from "@/state/session/sessionSlice";

export const SHOW_TIMER_KEY = "vcell:showTimer";
export const MOTION_PREFERENCE_KEY = "vcell:motionPreference";
export const UNDO_LIMIT_KEY = "vcell:undoLimit";
export const FACE_DOWN_COUNT_KEY = "vcell:faceDownCount";
export const ALLOW_FOUNDATION_PULLBACK_KEY = "vcell:allowFoundationPullback";

type SettingsListenerState = {
  ui: {
    showTimer: boolean;
    motionPreference: MotionPreference;
    settingsHydrated: boolean;
    isAnyModalOpen: boolean;
  };
  game: {
    rules: {
      undoLimit: number | "unlimited";
      faceDownCount: number;
      allowFoundationPullback: boolean;
    };
  };
};
export const settingsListenerMiddleware =
  createListenerMiddleware<SettingsListenerState>();

settingsListenerMiddleware.startListening({
  predicate: (_action, currentState, previousState) =>
    currentState.ui.isAnyModalOpen !== previousState.ui.isAnyModalOpen,
  effect: async (_action, listenerApi) => {
    listenerApi.dispatch(setPaused(listenerApi.getState().ui.isAnyModalOpen));
  }
});

settingsListenerMiddleware.startListening({
  actionCreator: setShowTimer,
  effect: async (_action, listenerApi) => {
    const state = listenerApi.getState();
    if (!state.ui.settingsHydrated) return;

    window.localStorage.setItem(SHOW_TIMER_KEY, String(state.ui.showTimer));
  }
});

settingsListenerMiddleware.startListening({
  actionCreator: setMotionPreference,
  effect: async (_action, listenerApi) => {
    const state = listenerApi.getState();
    if (!state.ui.settingsHydrated) return;

    window.localStorage.setItem(
      MOTION_PREFERENCE_KEY,
      state.ui.motionPreference
    );
  }
});

settingsListenerMiddleware.startListening({
  actionCreator: setUndoLimitRule,
  effect: async (_action, listenerApi) => {
    const state = listenerApi.getState();
    if (!state.ui.settingsHydrated) return;

    window.localStorage.setItem(
      UNDO_LIMIT_KEY,
      String(state.game.rules.undoLimit)
    );
  }
});

settingsListenerMiddleware.startListening({
  actionCreator: setFaceDownCountRule,
  effect: async (_action, listenerApi) => {
    const state = listenerApi.getState();
    if (!state.ui.settingsHydrated) return;

    window.localStorage.setItem(
      FACE_DOWN_COUNT_KEY,
      String(state.game.rules.faceDownCount)
    );
  }
});

settingsListenerMiddleware.startListening({
  actionCreator: setAllowFoundationPullbackRule,
  effect: async (_action, listenerApi) => {
    const state = listenerApi.getState();
    if (!state.ui.settingsHydrated) return;

    window.localStorage.setItem(
      ALLOW_FOUNDATION_PULLBACK_KEY,
      String(state.game.rules.allowFoundationPullback)
    );
  }
});
