import { configureStore } from "@reduxjs/toolkit";
import { gameReducer } from "./game";

export const reduxStore = configureStore({
  reducer: {
    game: gameReducer
  }
});

export type RootState = ReturnType<typeof reduxStore.getState>;
export type AppDispatch = typeof reduxStore.dispatch;
