import { configureStore } from "@reduxjs/toolkit";
import { gameReducer } from "./game";
import { sessionReducer } from "./session";

export const reduxStore = configureStore({
  reducer: {
    game: gameReducer,
    session: sessionReducer
  }
});

export type RootState = ReturnType<typeof reduxStore.getState>;
export type AppDispatch = typeof reduxStore.dispatch;
