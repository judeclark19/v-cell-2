"use client";

import React, { createContext, useContext, useMemo } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import { useAuthSession } from "@/lib/useAuthSession";

export type SessionMode = "guest" | "user";

export type SessionState = {
  mode: SessionMode;
  uid: string | null;
};

export type RequireUserResult =
  | { ok: true }
  | { ok: false; reason: "not_logged_in" | "auth_not_ready" };

export type SessionContextValue = {
  session: SessionState;

  // Backwards-compatible API (guest is default, user requires real login)
  setGuest: () => void;
  setUser: () => void;
  logout: () => Promise<void>;

  // Convenience flags
  isGuest: boolean;
  isUser: boolean;
  hydrated: boolean;

  // Raw auth state (when not logged in, uid is null)
  authReady: boolean;
  uid: string | null;

  // Route guards
  requireUser: () => RequireUserResult;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within <SessionProvider />");
  }
  return ctx;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  // Important: We do NOT auto-create anonymous users.
  // Guests play locally (IndexedDB) with no Firebase UID.
  const { uid, ready: authReady } = useAuthSession();

  const value = useMemo<SessionContextValue>(() => {
    const hydrated = authReady;

    const isUser = Boolean(uid);
    const mode: SessionMode = isUser ? "user" : "guest";

    // In guest mode, uid is intentionally null.
    const session: SessionState = { mode, uid: isUser ? uid : null };

    const isGuest = !isUser;

    const requireUser = (): RequireUserResult => {
      if (!authReady) return { ok: false, reason: "auth_not_ready" };
      return isUser ? { ok: true } : { ok: false, reason: "not_logged_in" };
    };

    const setGuest = () => {
      // No-op by design. Guest is the default when not logged in.
    };

    const setUser = () => {
      // Not implemented yet.
      // Later: trigger Google/email login.
      console.warn(
        "setUser() not implemented. Add real provider login to switch from guest to user."
      );
    };

    const logout = async () => {
      // If logged in, sign out. Guests already have no auth session.
      await signOut(auth);
    };

    return {
      session,
      setGuest,
      setUser,
      logout,
      isGuest,
      isUser,
      hydrated,
      authReady,
      uid: session.uid,
      requireUser
    };
  }, [uid, authReady]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
