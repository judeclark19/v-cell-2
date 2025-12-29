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

  // For guarding pages that require login
  requireUser: () => RequireUserResult;
};

export type RequireUserResult =
  | { ok: true }
  | { ok: false; reason: "not_logged_in" };

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
  const [session, setSession] = useState<SessionState>(() => {
    const restored = safeParse(localStorage.getItem(STORAGE_KEY));
    return restored ?? DEFAULT_SESSION;
  });

  // Persist on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [session]);

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
      requireUser
    };
  }, [session]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
