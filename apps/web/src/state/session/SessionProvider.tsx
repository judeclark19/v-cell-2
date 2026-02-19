"use client";

import React, { createContext, useContext, useEffect, useMemo } from "react";
import { auth, db } from "@/lib/firebaseClient";
import { useAuthSession } from "@/lib/useAuthSession";
import { signOut, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  getInProgressGameForDevice,
  upsertInProgressGame
} from "@/persistence/inProgressGamesStore";
import { clearCompletedGames } from "@/persistence/completedGamesStore";
import { getOrCreateDeviceId } from "@/persistence/schema";
import { useCloudGamesHydration } from "@/persistence/hooks/useCloudGamesHydration";

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

  loginWithGoogle: () => Promise<void>;
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

  useCloudGamesHydration(uid);

  useEffect(() => {
    if (!authReady) return;
    if (!uid) return;

    console.log("[session] logged in as", uid);

    (async () => {
      try {
        const userRef = doc(db, "users", uid);
        const snap = await getDoc(userRef);
        const isFirstSignup = !snap.exists();

        // Ensure a user profile doc exists. Firestore collections appear when a doc is written.
        // Keep it minimal for now; add username/profile fields later.
        await setDoc(
          userRef,
          {
            uid,
            ...(isFirstSignup ? { createdAtMs: Date.now() } : {}),
            lastLoginAtMs: Date.now(),
            displayName: auth.currentUser?.displayName ?? null
          },
          { merge: true }
        );

        if (isFirstSignup) {
          // Local first-login migration:
          // - wipe local completed history (it will later come from the account)
          // - stamp the current in-progress game with userId
          await clearCompletedGames();

          const deviceId = getOrCreateDeviceId();
          const inProgress = await getInProgressGameForDevice(deviceId);
          if (inProgress) {
            await upsertInProgressGame({ ...inProgress, userId: uid });
          }

          // Mark that we ran the local first-login migration so any future
          // Firestore -> IndexedDB hydration can choose an explicit strategy.
          await setDoc(
            userRef,
            {
              didLocalMigrationAtMs: Date.now(),
              didLocalMigrationDeviceId: deviceId,
              cloudHydrationStrategy: "cloud_wins_after_first_login"
            },
            { merge: true }
          );

          // Local marker for clients: allows us to skip initial cloud pull during this login.
          // (Future hydration code can consult this and clear it once pull completes.)
          try {
            // Device-scoped marker: only this device should skip the initial cloud pull
            // during the first-signup login that just performed local migration.
            // Other devices should NOT skip cloud hydration.
            localStorage.setItem(
              `vcell:skipCloudPull:${uid}:${deviceId}`,
              JSON.stringify({
                ts: Date.now(),
                reason: "first_signup_local_migration"
              })
            );
          } catch {
            // ignore (private mode / storage disabled)
          }
          try {
            localStorage.removeItem(`vcell:skipCloudPull:${uid}`);
          } catch {
            // ignore
          }
        }
      } catch (err) {
        console.error("[session] failed to upsert user doc", err);
      }
    })();
  }, [uid, authReady]);

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

    const loginWithGoogle = async () => {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
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
      requireUser,
      loginWithGoogle
    };
  }, [uid, authReady]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
