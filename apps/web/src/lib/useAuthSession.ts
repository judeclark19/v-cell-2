"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebaseClient";

type AuthState = {
  ready: boolean;
  user: User | null;
  uid: string | null;
  isAnonymous: boolean;
};

/**
 * Read-only Firebase auth state.
 *
 * This hook does NOT create users or trigger sign-in.
 * It only reports whether a real Firebase user already exists
 * (e.g., from a previous login session).
 *
 * Guests are handled at the SessionProvider level and do not
 * automatically create Firebase users.
 */
export function useAuthSession(): AuthState {
  const [state, setState] = useState<AuthState>({
    ready: false,
    user: null,
    uid: null,
    isAnonymous: false
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setState({
        ready: true,
        user,
        uid: user?.uid ?? null,
        isAnonymous: user?.isAnonymous ?? false
      });
    });

    return () => unsubscribe();
  }, []);

  return state;
}
