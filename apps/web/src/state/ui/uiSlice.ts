import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { ConfirmRequest } from "@/features/game-board/components/BoardModals";
import type { MotionPreference } from "./motionPreference";

export interface UiState {
  showTimer: boolean;
  motionPreference: MotionPreference;
  settingsHydrated: boolean;
  confirmModal: ConfirmRequest | null;
  winModal: boolean;
  pauseModal: boolean;
  settingsModal: boolean;
  isAnyModalOpen: boolean;
}

const initialState: UiState = {
  showTimer: true,
  motionPreference: "system",
  settingsHydrated: false,
  confirmModal: null,
  winModal: false,
  pauseModal: false,
  settingsModal: false,
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
    openPauseModal: (state) => {
      state.pauseModal = true;
      state.isAnyModalOpen = true;
    },
    closePauseModal: (state) => {
      state.pauseModal = false;
      state.isAnyModalOpen = false;
    },
    openSettingsModal: (state) => {
      state.settingsModal = true;
      state.isAnyModalOpen = true;
    },
    closeSettingsModal: (state) => {
      state.settingsModal = false;
      state.isAnyModalOpen = false;
    },
    toggleSettingsModal: (state) => {
      state.settingsModal = !state.settingsModal;
      state.isAnyModalOpen = state.settingsModal;
    },
    setIsAnyModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isAnyModalOpen = action.payload;

      if (!action.payload) {
        state.confirmModal = null;
        state.winModal = false;
        state.pauseModal = false;
        state.settingsModal = false;
      }
    },
    setShowTimer: (state, action: PayloadAction<boolean>) => {
      state.showTimer = action.payload;
    },
    setMotionPreference: (state, action: PayloadAction<MotionPreference>) => {
      state.motionPreference = action.payload;
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
  openPauseModal,
  closePauseModal,
  openSettingsModal,
  closeSettingsModal,
  toggleSettingsModal,
  setShowTimer,
  setMotionPreference,
  setSettingsHydrated,
  setIsAnyModalOpen
} = uiSlice.actions;
export const uiReducer = uiSlice.reducer;

export const selectConfirmModal = (state: { ui: UiState }) =>
  state.ui.confirmModal;
export const selectShowTimer = (state: { ui: UiState }) => state.ui.showTimer;
export const selectMotionPreference = (state: { ui: UiState }) =>
  state.ui.motionPreference;
export const selectSettingsHydrated = (state: { ui: UiState }) =>
  state.ui.settingsHydrated;
export const selectIsAnyModalOpen = (state: { ui: UiState }) =>
  state.ui.isAnyModalOpen;
export const selectWinModal = (state: { ui: UiState }) => state.ui.winModal;
export const selectPauseModal = (state: { ui: UiState }) => state.ui.pauseModal;
export const selectSettingsModal = (state: { ui: UiState }) =>
  state.ui.settingsModal;
