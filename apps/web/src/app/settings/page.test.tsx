"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";
import SettingsPage from "./page";
import { type UiState, uiReducer } from "@/state/ui/uiSlice";

vi.mock("@/state/theme/ThemeProvider", () => ({
  useTheme: () => ({
    theme: "poker",
    setTheme: vi.fn()
  })
}));

vi.mock("@/state/auth/AuthProvider", () => ({
  useSession: () => ({
    isUser: false
  })
}));

vi.mock("@/state/network/useIsOffline", () => ({
  useIsOffline: () => false
}));

vi.mock("@/ui/AccountSettings", () => ({
  default: function AccountSettings() {
    return null;
  }
}));

describe("SettingsPage", () => {
  it("shows the saved motion preference and updates it from the select", () => {
    const preloadedUiState: UiState = {
      showTimer: true,
      motionPreference: "reduce",
      settingsHydrated: true,
      authStatusModal: null,
      confirmModal: null,
      winModal: false,
      pauseModal: false,
      settingsModal: false,
      isAnyModalOpen: false
    };

    const store = configureStore({
      reducer: {
        ui: uiReducer
      },
      preloadedState: {
        ui: preloadedUiState
      }
    });

    render(
      <Provider store={store}>
        <SettingsPage />
      </Provider>
    );

    const reduceMotionSelect = screen.getByRole("combobox", {
      name: /Reduce motion/
    });
    expect(reduceMotionSelect).toHaveValue("reduce");

    fireEvent.change(reduceMotionSelect, { target: { value: "full" } });

    expect(store.getState().ui.motionPreference).toBe("full");
    expect(
      screen.getByRole("combobox", { name: /Reduce motion/ })
    ).toHaveValue("full");
  });
});
