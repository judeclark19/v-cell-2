import { createListenerMiddleware } from "@reduxjs/toolkit";
import { setUndoLimitRule, setFaceDownCountRule } from "@/state/game/gameSlice";
import { setShowTimer } from "@/state/ui/uiSlice";

const SHOW_TIMER_KEY = "vcell:showTimer";
const UNDO_LIMIT_KEY = "vcell:undoLimit";
const FACE_DOWN_COUNT_KEY = "vcell:faceDownCount";

type SettingsListenerState = {
  ui: {
    showTimer: boolean;
    settingsHydrated: boolean;
  };
  game: {
    rules: {
      undoLimit: number | "unlimited";
      faceDownCount: number;
    };
  };
};
export const settingsListenerMiddleware =
  createListenerMiddleware<SettingsListenerState>();

settingsListenerMiddleware.startListening({
  actionCreator: setShowTimer,
  effect: async (_action, listenerApi) => {
    const state = listenerApi.getState();
    if (!state.ui.settingsHydrated) return;

    window.localStorage.setItem(SHOW_TIMER_KEY, String(state.ui.showTimer));
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
