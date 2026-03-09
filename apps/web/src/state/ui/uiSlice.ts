import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { ConfirmRequest } from "@/features/game-board/components/BoardModals";

export interface UiState {
  confirmReq: ConfirmRequest | null;
}

const initialState: UiState = {
  confirmReq: null
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    openConfirm: (state, action: PayloadAction<ConfirmRequest>) => {
      state.confirmReq = action.payload;
    },
    closeConfirm: (state) => {
      state.confirmReq = null;
    }
  }
});

export const { openConfirm, closeConfirm } = uiSlice.actions;
export const uiReducer = uiSlice.reducer;

export const selectConfirmReq = (state: { ui: UiState }) => state.ui.confirmReq;
