import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { PersistedGame } from "@/persistence/types";
import { RootState } from "../reduxStore";

export interface RecordsState {
  completedGames: PersistedGame[];
}

const initialState: RecordsState = {
  completedGames: []
};

export const recordsSlice = createSlice({
  name: "records",
  initialState,
  reducers: {
    setCompletedGames: (state, action: PayloadAction<PersistedGame[]>) => {
      state.completedGames = action.payload;
    },

    addCompletedGame: (state, action: PayloadAction<PersistedGame>) => {
      state.completedGames = [
        action.payload,
        ...state.completedGames.filter(
          (game) => game.sessionId !== action.payload.sessionId
        )
      ];
    },

    clearCompletedGames: (state) => {
      state.completedGames = [];
    }
  }
});

export const { setCompletedGames, addCompletedGame, clearCompletedGames } =
  recordsSlice.actions;

export const recordsReducer = recordsSlice.reducer;

export const selectCompletedGames = (state: RootState) =>
  state.records.completedGames;
