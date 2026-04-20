"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseClient";
import { useSession } from "@/state/auth/AuthProvider";

type UseLoginAuthFlowsArgs = {
  isOffline: boolean;
  nextPath: string;
  replaceToNextPath: () => void;
};

export type LoginAuthFlowsState = {
  loginEmail: string;
  loginPassword: string;
  loginLoading: boolean;
  loginError: string | null;
  canSubmitLogin: boolean;
  setLoginEmail: (value: string) => void;
  setLoginPassword: (value: string) => void;
  loginWithEmail: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  signupDisplayName: string;
  signupEmail: string;
  signupPassword: string;
  signupLoading: boolean;
  signupError: string | null;
  canSubmitSignup: boolean;
  setSignupDisplayName: (value: string) => void;
  setSignupEmail: (value: string) => void;
  setSignupPassword: (value: string) => void;
  signupWithEmail: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  loginAndContinue: () => Promise<void>;
};

export function useLoginAuthFlows({
  isOffline,
  replaceToNextPath
}: UseLoginAuthFlowsArgs): LoginAuthFlowsState {
  const { loginWithGoogle } = useSession();

  const [signupDisplayName, setSignupDisplayName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const canSubmitSignup = useMemo(() => {
    const dn = signupDisplayName.trim();
    const em = signupEmail.trim();
    return dn.length > 0 && em.length > 0 && signupPassword.length >= 6;
  }, [signupDisplayName, signupEmail, signupPassword]);

  const canSubmitLogin = useMemo(() => {
    const em = loginEmail.trim();
    return em.length > 0 && loginPassword.length > 0;
  }, [loginEmail, loginPassword]);

  const loginAndContinue = async () => {
    if (isOffline) return;
    await loginWithGoogle();
  };

  const loginWithEmail = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isOffline || loginLoading) return;

    setLoginError(null);

    const email = loginEmail.trim();
    const password = loginPassword;

    if (!email || !password) {
      setLoginError("Please enter your email and password.");
      return;
    }

    setLoginLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setLoginPassword("");
      replaceToNextPath();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoginLoading(false);
    }
  };

  const signupWithEmail = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isOffline || signupLoading) return;

    setSignupError(null);

    const displayName = signupDisplayName.trim();
    const email = signupEmail.trim();
    const password = signupPassword;

    if (!displayName || !email || password.length < 6) {
      setSignupError(
        "Please enter a display name, email, and a password (6+ characters)."
      );
      return;
    }

    setSignupLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      // Set Auth displayName immediately so the app doesn't think you're incomplete.
      await updateProfile(cred.user, { displayName });

      // Seed Firestore user doc (ensureUserProfile will reconcile too; this prevents loops).
      const now = Date.now();
      await setDoc(
        doc(db, "users", cred.user.uid),
        {
          createdAtMs: now,
          lastLoginAtMs: now,
          displayName,
          needsHowToPlay: true,
          email,
          providers: ["password"]
        },
        { merge: true }
      );

      setSignupDisplayName("");
      setSignupEmail("");
      setSignupPassword("");
      replaceToNextPath();
    } catch (err) {
      setSignupError(err instanceof Error ? err.message : "Sign up failed.");
    } finally {
      setSignupLoading(false);
    }
  };

  return {
    loginEmail,
    loginPassword,
    loginLoading,
    loginError,
    canSubmitLogin,
    setLoginEmail,
    setLoginPassword,
    loginWithEmail,
    signupDisplayName,
    signupEmail,
    signupPassword,
    signupLoading,
    signupError,
    canSubmitSignup,
    setSignupDisplayName,
    setSignupEmail,
    setSignupPassword,
    signupWithEmail,
    loginAndContinue
  };
}
