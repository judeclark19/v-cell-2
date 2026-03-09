import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { ConfirmRequest } from "@/features/game-board/components/BoardModals";

export interface UiState {
  confirmReq: ConfirmRequest | null;
  showTimer: boolean;
}

const initialState: UiState = {
  confirmReq: null,
  showTimer: true
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
    },
    setShowTimer: (state, action: PayloadAction<boolean>) => {
      state.showTimer = action.payload;
    }
  }
});

export const { openConfirm, closeConfirm, setShowTimer } = uiSlice.actions;
export const uiReducer = uiSlice.reducer;

export const selectConfirmReq = (state: { ui: UiState }) => state.ui.confirmReq;
export const selectShowTimer = (state: { ui: UiState }) => state.ui.showTimer;
