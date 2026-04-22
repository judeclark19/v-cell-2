import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../reduxStore";

export interface AuthStoreState {
  uid: string | null;
  authReady: boolean;
  displayName: string | null;
  email: string | null;
}

const initialState: AuthStoreState = {
  uid: null,
  authReady: false,
  displayName: null,
  email: null
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthState: (
      state,
      action: PayloadAction<{
        uid: string | null;
        authReady: boolean;
        displayName: string | null;
        email: string | null;
      }>
    ) => {
      state.uid = action.payload.uid;
      state.authReady = action.payload.authReady;
      state.displayName = action.payload.displayName;
      state.email = action.payload.email;
    },
    clearAuthState: (state) => {
      state.uid = null;
      state.authReady = true;
      state.displayName = null;
      state.email = null;
    },
    setAuthDisplayName: (state, action: PayloadAction<string | null>) => {
      state.displayName = action.payload;
    }
  }
});

export const authReducer = authSlice.reducer;

export const { setAuthState, clearAuthState, setAuthDisplayName } =
  authSlice.actions;

// Selectors
export const selectUid = (state: RootState) => state.auth.uid;
export const selectAuthReady = (state: RootState) => state.auth.authReady;
export const selectDisplayName = (state: RootState) => state.auth.displayName;
export const selectEmail = (state: RootState) => state.auth.email;
