"use client";

import React, { createContext, useContext, useEffect, useMemo } from "react";
import { auth, db } from "@/lib/firebaseClient";
import {
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "firebase/auth";
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
import { useDispatch, useSelector } from "react-redux";
import {
  selectAuthReady,
  selectUid,
  setAuthState
} from "@/state/auth/authSlice";
import { LOGIN_PROMPT_DISMISS_KEY } from "@/ui/LoginPrompt";

export type RequireUserResult =
  | { ok: true }
  | { ok: false; reason: "not_logged_in" | "auth_not_ready" };

export type SessionContextValue = {
  logout: () => Promise<void>;

  // Convenience flags
  isGuest: boolean;
  isUser: boolean;
  hydrated: boolean;

  // Raw auth state (when not logged in, uid is null)
  authReady: boolean;

  // Route guards
  requireUser: () => RequireUserResult;

  loginWithGoogle: () => Promise<void>;

  profileReady: boolean;
  profileComplete: boolean;
  needsHowToPlay: boolean;

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

  const dispatch = useDispatch();

  const authReady = useSelector(selectAuthReady);
  const uid = useSelector(selectUid);

  const profileState = useEnsureUserProfile(uid, authReady);

  useCloudGamesHydration(uid);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      dispatch(
        setAuthState({
          authReady: true,
          uid: user?.uid ?? null,
          displayName: user?.displayName ?? null,
          email: user?.email ?? null
        })
      );
    });

    return unsubscribe;
  }, [dispatch]);

  const value = useMemo<SessionContextValue>(() => {
    const hydrated = authReady;
    const isUser = Boolean(uid);
    const isGuest = !isUser;

    const requireUser = (): RequireUserResult => {
      if (!authReady) return { ok: false, reason: "auth_not_ready" };
      return isUser ? { ok: true } : { ok: false, reason: "not_logged_in" };
    };

    const logout = async () => {
      const deviceId = getOrCreateDeviceId();

      try {
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
        await deleteInProgressGameForDevice(deviceId);
        await clearCompletedGames();
      } finally {
        // Always attempt sign-out even if local cleanup fails.
        await signOut(auth);
        window.localStorage.setItem(LOGIN_PROMPT_DISMISS_KEY, "false");
      }
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
      logout,
      isGuest,
      isUser,
      hydrated,
      authReady,
      requireUser,
      loginWithGoogle,
      profileReady: derivedProfileReady,
      profileComplete: derivedProfileComplete,
      needsHowToPlay:
        profileState.uid === uid ? profileState.needsHowToPlay : false,
      displayName: derivedDisplayName
    };
  }, [uid, authReady, profileState]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
