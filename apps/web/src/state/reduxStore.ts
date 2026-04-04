import { configureStore } from "@reduxjs/toolkit";
import { gameReducer } from "./game/gameSlice";
import { sessionReducer } from "./session/sessionSlice";
import { recordsReducer } from "./records/recordsSlice";
import { uiReducer } from "./ui/uiSlice";
import { settingsListenerMiddleware } from "./ui/settingsListeners";
import { authReducer } from "./auth/authSlice";

export const reduxStore = configureStore({
  reducer: {
    auth: authReducer,
    session: sessionReducer,
    game: gameReducer,
    records: recordsReducer,
    ui: uiReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActionPaths: ["payload.onConfirm", "payload.onCancel"]
      }
    }).prepend(settingsListenerMiddleware.middleware) // TODO: fix this shit
});

export type RootState = ReturnType<typeof reduxStore.getState>;
export type AppDispatch = typeof reduxStore.dispatch;
