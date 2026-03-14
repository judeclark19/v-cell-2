import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { ConfirmRequest } from "@/features/game-board/components/BoardModals";

export interface UiState {
  showTimer: boolean;
  settingsHydrated: boolean;
  confirmModal: ConfirmRequest | null;
  winModal: boolean;
  isAnyModalOpen: boolean;
}

const initialState: UiState = {
  showTimer: true,
  settingsHydrated: false,
  confirmModal: null,
  winModal: false,
  isAnyModalOpen: false
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    openConfirmModal: (state, action: PayloadAction<ConfirmRequest>) => {
      state.confirmModal = action.payload;
      state.isAnyModalOpen = true;
    },
    closeConfirmModal: (state) => {
      state.confirmModal = null;
      state.isAnyModalOpen = false;
    },
    openWinModal: (state) => {
      state.winModal = true;
      state.isAnyModalOpen = true;
    },
    closeWinModal: (state) => {
      state.winModal = false;
      state.isAnyModalOpen = false;
    },
    setIsAnyModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isAnyModalOpen = action.payload;
    },
    setShowTimer: (state, action: PayloadAction<boolean>) => {
      state.showTimer = action.payload;
    },
    setSettingsHydrated: (state, action: PayloadAction<boolean>) => {
      state.settingsHydrated = action.payload;
    }
  }
});

export const {
  openConfirmModal,
  closeConfirmModal,
  openWinModal,
  closeWinModal,
  setShowTimer,
  setSettingsHydrated,
  setIsAnyModalOpen
} = uiSlice.actions;
export const uiReducer = uiSlice.reducer;

export const selectConfirmModal = (state: { ui: UiState }) =>
  state.ui.confirmModal;
export const selectShowTimer = (state: { ui: UiState }) => state.ui.showTimer;
export const selectSettingsHydrated = (state: { ui: UiState }) =>
  state.ui.settingsHydrated;
export const selectIsAnyModalOpen = (state: { ui: UiState }) =>
  state.ui.isAnyModalOpen;
export const selectWinModal = (state: { ui: UiState }) => state.ui.winModal;
