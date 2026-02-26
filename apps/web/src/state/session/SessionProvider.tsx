"use client";

import React, { createContext, useContext, useMemo } from "react";
import { auth, db } from "@/lib/firebaseClient";
import { useAuthSession } from "@/lib/useAuthSession";
import { signOut, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import {
  collection,
  getDocs,
  getDocsFromServer,
  limit,
  orderBy,
  query,
  updateDoc,
  where
} from "firebase/firestore";
import { deleteInProgressGameForDevice } from "@/persistence/inProgressGamesStore";
import { clearCompletedGames } from "@/persistence/completedGamesStore";
import { getOrCreateDeviceId } from "@/persistence/schema";
import { useCloudGamesHydration } from "@/persistence/hooks/useCloudGamesHydration";
import { useEnsureUserProfile } from "@/state/session/hooks/useEnsureUserProfile";

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

  profileReady: boolean;
  profileComplete: boolean;

  displayName: string;
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

  const profileState = useEnsureUserProfile(uid, authReady);

  useCloudGamesHydration(uid);

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
      const deviceId = getOrCreateDeviceId();

      // If logged in, pause the cloud in-progress game for THIS device.
      // Do this BEFORE signOut so Firestore rules still allow the write.
      if (uid) {
        try {
          const gamesCol = collection(db, "users", uid, "games");
          const q = query(
            gamesCol,
            where("status", "==", "in_progress"),
            where("deviceId", "==", deviceId),
            orderBy("updatedAtMs", "desc"),
            limit(1)
          );

          let snap;
          try {
            snap = await getDocsFromServer(q);
          } catch {
            snap = await getDocs(q);
          }

          const cloudDoc = snap.docs[0];
          if (cloudDoc) {
            await updateDoc(cloudDoc.ref, {
              paused: true,
              updatedAtMs: Date.now()
            });
          }
        } catch (err) {
          console.warn(
            "[session] failed to pause cloud in-progress on logout",
            err
          );
        }
      }

      // Clear local persistence so guest mode starts fresh.
      await deleteInProgressGameForDevice(deviceId, "log out");
      await clearCompletedGames();

      // Finally, sign out (guests already have no auth session).
      await signOut(auth);
    };

    const loginWithGoogle = async () => {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    };

    const authDisplayName = auth.currentUser?.displayName ?? "";

    const derivedDisplayName = uid
      ? profileState.uid === uid
        ? (profileState.displayName ?? authDisplayName ?? "")
        : (authDisplayName ?? "")
      : "";

    const derivedProfileComplete = uid
      ? profileState.uid === uid
        ? profileState.complete || derivedDisplayName.trim().length > 0
        : authDisplayName.trim().length > 0
      : false;

    const derivedProfileReady = uid
      ? profileState.uid === uid && profileState.ready
      : authReady;

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
      loginWithGoogle,
      profileReady: derivedProfileReady,
      profileComplete: derivedProfileComplete,
      displayName: derivedDisplayName
    };
  }, [uid, authReady, profileState]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
