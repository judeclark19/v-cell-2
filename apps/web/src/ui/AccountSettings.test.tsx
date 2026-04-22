"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccountSettings from "./AccountSettings";
import { authReducer } from "@/state/auth/authSlice";

const updateProfileMock = vi.fn();
const onAuthStateChangedMock = vi.fn();
const setDocMock = vi.fn();
const docMock = vi.fn();
const reloadMock = vi.fn();
const authState = {
  uid: "user-1",
  displayName: "Jude",
  reload: reloadMock
};

vi.mock("@/lib/firebaseClient", () => ({
  auth: { currentUser: null },
  db: { __brand: "db" }
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (...args: unknown[]) => onAuthStateChangedMock(...args),
  updateProfile: (...args: unknown[]) => updateProfileMock(...args)
}));

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => docMock(...args),
  setDoc: (...args: unknown[]) => setDocMock(...args)
}));

describe("AccountSettings", () => {
  beforeEach(() => {
    updateProfileMock.mockReset();
    onAuthStateChangedMock.mockReset();
    setDocMock.mockReset();
    docMock.mockReset();
    reloadMock.mockReset();

    onAuthStateChangedMock.mockImplementation((_, callback) => {
      callback(authState);
      return () => {};
    });
    docMock.mockImplementation((_, collectionName, docId) => ({
      path: `${collectionName}/${docId}`
    }));
  });

  it("updates the display name in Auth and Firestore", async () => {
    updateProfileMock.mockResolvedValueOnce(undefined);
    setDocMock.mockResolvedValueOnce(undefined);
    reloadMock.mockResolvedValueOnce(undefined);

    const store = configureStore({
      reducer: {
        auth: authReducer
      }
    });

    render(
      <Provider store={store}>
        <AccountSettings />
      </Provider>
    );

    fireEvent.change(screen.getByPlaceholderText(/Enter new display name/i), {
      target: { value: "Jude Clark" }
    });
    fireEvent.submit(screen.getByRole("button", { name: /Save/i }).closest("form")!);

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledWith(authState, {
        displayName: "Jude Clark"
      });
    });
    expect(setDocMock).toHaveBeenCalledWith(
      { path: "users/user-1" },
      { displayName: "Jude Clark" },
      { merge: true }
    );
    expect(reloadMock).toHaveBeenCalled();
    expect(store.getState().auth.displayName).toBe("Jude Clark");
    expect(
      await screen.findByText("Display name updated.")
    ).toBeInTheDocument();
  });

  it("blocks empty display names before attempting any writes", async () => {
    const store = configureStore({
      reducer: {
        auth: authReducer
      }
    });

    render(
      <Provider store={store}>
        <AccountSettings />
      </Provider>
    );

    fireEvent.change(screen.getByPlaceholderText(/Enter new display name/i), {
      target: { value: "   " }
    });
    fireEvent.submit(screen.getByRole("button", { name: /Save/i }).closest("form")!);

    expect(await screen.findByText("Display name cannot be empty.")).toBeInTheDocument();
    expect(updateProfileMock).not.toHaveBeenCalled();
    expect(setDocMock).not.toHaveBeenCalled();
  });
});
