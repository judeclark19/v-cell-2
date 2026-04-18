"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authReducer } from "@/state/auth/authSlice";
import { AuthGate } from "./AuthGate";

const replaceMock = vi.fn();
let pathnameState = "/game";
const sessionState = {
  authReady: true,
  profileReady: true,
  needsHowToPlay: false
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock
  }),
  usePathname: () => pathnameState
}));

vi.mock("@/state/auth/AuthProvider", () => ({
  useSession: () => sessionState
}));

function renderGate({
  uid = null
}: {
  uid?: string | null;
} = {}) {
  const store = configureStore({
    reducer: {
      auth: authReducer
    },
    preloadedState: {
      auth: {
        uid,
        authReady: true,
        displayName: null,
        email: null
      }
    }
  });

  return render(
    <Provider store={store}>
      <AuthGate>
        <div>Protected content</div>
      </AuthGate>
    </Provider>
  );
}

describe("AuthGate", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    pathnameState = "/game";
    sessionState.authReady = true;
    sessionState.profileReady = true;
    sessionState.needsHowToPlay = false;
  });

  it("renders children for signed-out users once auth is ready", () => {
    renderGate();

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("waits for the user profile before rendering signed-in content", () => {
    sessionState.profileReady = false;

    renderGate({ uid: "user-1" });

    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects signed-in users to how-to-play when needed", async () => {
    sessionState.needsHowToPlay = true;

    renderGate({ uid: "user-1" });

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/how-to-play");
    });
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("does not redirect again when already on how-to-play", () => {
    pathnameState = "/how-to-play";
    sessionState.needsHowToPlay = true;

    renderGate({ uid: "user-1" });

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
