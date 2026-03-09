import { configureStore } from "@reduxjs/toolkit";
import { gameReducer } from "./game";
import { sessionReducer } from "./session";
import { recordsReducer } from "./records/recordsSlice";

export const reduxStore = configureStore({
  reducer: {
    game: gameReducer,
    session: sessionReducer,
    records: recordsReducer
  }
});

export type RootState = ReturnType<typeof reduxStore.getState>;
export type AppDispatch = typeof reduxStore.dispatch;
