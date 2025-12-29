"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

export type SessionMode = "unset" | "guest" | "user";

export type SessionState = {
  mode: SessionMode;
  // When we later add auth, uid becomes meaningful.
  uid: string | null;
};

export type RequireUserResult =
  | { ok: true }
  | { ok: false; reason: "not_logged_in" };

export type SessionContextValue = {
  session: SessionState;
  setGuest: () => void;
  // Temporary: "log in" is just setting mode=user. Later it will come from real auth.
  setUser: (uid?: string) => void;
  logout: () => void;

  // Convenience helpers for route gating / UI gating
  isGuest: boolean;
  isUser: boolean;
  isUnset: boolean;
  hydrated: boolean;

  // For guarding pages that require login
  requireUser: () => RequireUserResult;
};

const STORAGE_KEY = "vcell.session.v1";

function safeParse(json: string | null): SessionState | null {
  if (!json) return null;
  try {
    const raw = JSON.parse(json) as Partial<SessionState>;
    const mode = raw.mode;
    if (mode !== "unset" && mode !== "guest" && mode !== "user") return null;
    const uid = typeof raw.uid === "string" ? raw.uid : null;
    return { mode, uid };
  } catch {
    return null;
  }
}

const DEFAULT_SESSION: SessionState = { mode: "unset", uid: null };

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx)
    throw new Error("useSession must be used within <SessionProvider />");
  return ctx;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  // Initialize from localStorage synchronously (client-only component)
  const [session, setSession] = useState<SessionState>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_SESSION;
    }
    const restored = safeParse(window.localStorage.getItem(STORAGE_KEY));
    return restored ?? DEFAULT_SESSION;
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // We intentionally sync React state from an external system (localStorage) after mount.
    // This prevents server/client markup mismatches while still restoring the session ASAP.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);

    const restored = safeParse(window.localStorage.getItem(STORAGE_KEY));
    if (restored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSession(restored);
    }
  }, []);

  // Persist on change (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [hydrated, session]);

  const setGuest = () => setSession({ mode: "guest", uid: null });

  const setUser = (uid?: string) =>
    setSession({ mode: "user", uid: uid ?? "dev-user-001" });

  const logout = () => setSession({ mode: "unset", uid: null });

  const value = useMemo<SessionContextValue>(() => {
    const isUnset = session.mode === "unset";
    const isGuest = session.mode === "guest";
    const isUser = session.mode === "user";

    const requireUser = (): RequireUserResult =>
      isUser ? { ok: true } : { ok: false, reason: "not_logged_in" };

    return {
      session,
      setGuest,
      setUser,
      logout,
      isGuest,
      isUser,
      isUnset,
      hydrated,
      requireUser
    };
  }, [session, hydrated]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
