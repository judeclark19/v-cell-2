import { createSlice } from "@reduxjs/toolkit";

export interface SessionStoreState {
  sessionPhase: "boot" | "hydrating" | "ready";
}

const initialState: SessionStoreState = {
  sessionPhase: "boot"
};

export const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {}
});

export const sessionReducer = sessionSlice.reducer;
