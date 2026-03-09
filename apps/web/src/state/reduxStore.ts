import { configureStore } from "@reduxjs/toolkit";
import { gameReducer } from "./game/gameSlice";
import { sessionReducer } from "./session/sessionSlice";
import { recordsReducer } from "./records/recordsSlice";
import { uiReducer } from "./ui/uiSlice";
import { settingsListenerMiddleware } from "./ui/settingsListeners";

export const reduxStore = configureStore({
  reducer: {
    game: gameReducer,
    session: sessionReducer,
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
