"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { describe, expect, it, beforeEach, vi } from "vitest";
import LoginClient from "./LoginClient";
import { authReducer, type AuthStoreState } from "@/state/auth/authSlice";

const replaceMock = vi.fn();
const searchParamsState = new URLSearchParams();
const sessionState = {
  isUser: false,
  hydrated: true,
  loginWithGoogle: vi.fn()
};
const offlineState = {
  isOffline: false
};

const signInWithEmailAndPasswordMock = vi.fn();
const createUserWithEmailAndPasswordMock = vi.fn();
const updateProfileMock = vi.fn();
const setDocMock = vi.fn();
const docMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock
  }),
  useSearchParams: () => searchParamsState
}));

vi.mock("@/state/auth/AuthProvider", () => ({
  useSession: () => sessionState
}));

vi.mock("@/state/network/useIsOffline", () => ({
  useIsOffline: () => offlineState.isOffline
}));

vi.mock("@/lib/firebaseClient", () => ({
  auth: { currentUser: null },
  db: { __brand: "db" }
}));

vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: (...args: unknown[]) =>
    signInWithEmailAndPasswordMock(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) =>
    createUserWithEmailAndPasswordMock(...args),
  updateProfile: (...args: unknown[]) => updateProfileMock(...args)
}));

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => docMock(...args),
  setDoc: (...args: unknown[]) => setDocMock(...args)
}));

function renderLoginClient({
  auth
}: {
  auth?: Partial<AuthStoreState>;
} = {}) {
  const store = configureStore({
    reducer: {
      auth: authReducer
    },
    preloadedState: {
      auth: {
        uid: null,
        authReady: true,
        displayName: null,
        email: null,
        ...auth
      }
    }
  });

  return render(
    <Provider store={store}>
      <LoginClient />
    </Provider>
  );
}

describe("LoginClient", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    sessionState.isUser = false;
    sessionState.hydrated = true;
    sessionState.loginWithGoogle.mockReset();
    offlineState.isOffline = false;
    searchParamsState.forEach((_, key) => searchParamsState.delete(key));
    signInWithEmailAndPasswordMock.mockReset();
    createUserWithEmailAndPasswordMock.mockReset();
    updateProfileMock.mockReset();
    setDocMock.mockReset();
    docMock.mockReset();
    docMock.mockImplementation((_, collectionName, docId) => ({
      path: `${collectionName}/${docId}`
    }));
  });

  it("defaults nextPath to /game and preserves it in the forgot-password link", () => {
    renderLoginClient();

    expect(
      screen.getByRole("link", { name: /Forgot password/i })
    ).toHaveAttribute("href", "/forgot-password?next=%2Fgame");
    expect(screen.getByText("/game")).toBeInTheDocument();
  });

  it("sanitizes non-internal next params back to /game", () => {
    searchParamsState.set("next", "https://evil.example");

    renderLoginClient();

    expect(
      screen.getByRole("link", { name: /Continue as a guest/i })
    ).toHaveAttribute("href", "/game");
    expect(
      screen.getByRole("link", { name: /Forgot password/i })
    ).toHaveAttribute("href", "/forgot-password?next=%2Fgame");
  });

  it("redirects authenticated users away from /login", async () => {
    sessionState.isUser = true;

    renderLoginClient({
      auth: {
        uid: "user-12345678"
      }
    });

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/game");
    });
  });

  it("shows offline guest copy and hides auth forms when offline", () => {
    offlineState.isOffline = true;

    renderLoginClient();

    expect(
      screen.getByText(/Cloud sync is unavailable right now/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Log in or sign up with Google/i })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /continue as a guest/i })
    ).toHaveAttribute("href", "/game");
  });

  it("surfaces email login validation and auth errors", async () => {
    signInWithEmailAndPasswordMock.mockRejectedValueOnce(
      new Error("Wrong password")
    );

    renderLoginClient();

    fireEvent.submit(screen.getByRole("button", { name: /^Log in$/i }).closest("form")!);
    expect(
      await screen.findByText("Please enter your email and password.")
    ).toBeInTheDocument();

    fireEvent.change(screen.getAllByLabelText(/^Email$/i)[0], {
      target: { value: "jude@example.com" }
    });
    fireEvent.change(screen.getAllByLabelText(/^Password$/i)[0], {
      target: { value: "secret123" }
    });
    fireEvent.submit(screen.getByRole("button", { name: /^Log in$/i }).closest("form")!);

    expect(signInWithEmailAndPasswordMock).toHaveBeenCalledWith(
      expect.anything(),
      "jude@example.com",
      "secret123"
    );
    expect(await screen.findByText("Wrong password")).toBeInTheDocument();
  });

  it("validates email signup fields before calling Firebase", async () => {
    renderLoginClient();

    fireEvent.submit(
      screen.getByRole("button", { name: /Create account/i }).closest("form")!
    );

    expect(
      await screen.findByText(
        "Please enter a display name, email, and a password (6+ characters)."
      )
    ).toBeInTheDocument();
    expect(createUserWithEmailAndPasswordMock).not.toHaveBeenCalled();
  });

  it("creates an email account and seeds the Firestore user doc", async () => {
    createUserWithEmailAndPasswordMock.mockResolvedValueOnce({
      user: { uid: "new-user-1" }
    });
    updateProfileMock.mockResolvedValueOnce(undefined);
    setDocMock.mockResolvedValueOnce(undefined);

    renderLoginClient();

    fireEvent.change(screen.getByLabelText(/Display name/i), {
      target: { value: "Jude" }
    });
    fireEvent.change(screen.getAllByLabelText(/^Email$/i)[1], {
      target: { value: "jude@example.com" }
    });
    fireEvent.change(screen.getAllByLabelText(/^Password$/i)[1], {
      target: { value: "secret123" }
    });

    fireEvent.submit(
      screen.getByRole("button", { name: /Create account/i }).closest("form")!
    );

    await waitFor(() => {
      expect(createUserWithEmailAndPasswordMock).toHaveBeenCalledWith(
        expect.anything(),
        "jude@example.com",
        "secret123"
      );
    });

    expect(updateProfileMock).toHaveBeenCalledWith(
      { uid: "new-user-1" },
      { displayName: "Jude" }
    );
    expect(setDocMock).toHaveBeenCalledWith(
      { path: "users/new-user-1" },
      expect.objectContaining({
        displayName: "Jude",
        email: "jude@example.com",
        profileComplete: true,
        needsHowToPlay: true,
        providers: ["password"]
      }),
      { merge: true }
    );
    expect(replaceMock).toHaveBeenCalledWith("/game");
  });
});
