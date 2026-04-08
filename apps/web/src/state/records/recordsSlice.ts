import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { PersistedGame } from "@/persistence/types";
import { RootState } from "../reduxStore";

export interface RecordsState {
  completedGames: PersistedGame[];
}

const initialState: RecordsState = {
  completedGames: []
};

function getRecordRank(game: PersistedGame): number {
  const syncRank =
    game.syncState === "synced" ? 2 : game.syncState === "uploaded" ? 1 : 0;
  const updatedAtMs = Number.isFinite(game.updatedAtMs) ? game.updatedAtMs : 0;
  const endedAtMs = Number.isFinite(game.endedAtMs) ? (game.endedAtMs ?? 0) : 0;

  return updatedAtMs * 10 + endedAtMs + syncRank;
}

function dedupeCompletedGames(games: PersistedGame[]): PersistedGame[] {
  const bySessionId = new Map<string, PersistedGame>();

  for (const game of games) {
    const existing = bySessionId.get(game.sessionId);
    if (!existing || getRecordRank(game) >= getRecordRank(existing)) {
      bySessionId.set(game.sessionId, game);
    }
  }

  return Array.from(bySessionId.values());
}

export const recordsSlice = createSlice({
  name: "records",
  initialState,
  reducers: {
    setCompletedGames: (state, action: PayloadAction<PersistedGame[]>) => {
      state.completedGames = dedupeCompletedGames(action.payload);
    },

    addCompletedGame: (state, action: PayloadAction<PersistedGame>) => {
      state.completedGames = dedupeCompletedGames([
        action.payload,
        ...state.completedGames
      ]);
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
