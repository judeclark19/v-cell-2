"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/state/auth/AuthProvider";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseClient";
import Link from "next/link";
import { selectUid } from "@/state/auth/authSlice";
import { useSelector } from "react-redux";
import { useIsOffline } from "@/state/network/useIsOffline";

export default function LoginClient() {
  const uid = useSelector(selectUid);
  const isOffline = useIsOffline();

  const router = useRouter();
  const searchParams = useSearchParams();

  // Where to return after login/guest selection.
  // Only allow internal paths.
  const rawNext = searchParams.get("next");
  const nextPath = rawNext && rawNext.startsWith("/") ? rawNext : "/game";

  const { isUser, hydrated, loginWithGoogle } = useSession();

  useEffect(() => {
    if (!hydrated || !isUser) return;
    router.replace(nextPath);
  }, [hydrated, isUser, nextPath, router]);

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

    // AuthGate / session routing will decide whether to send the user to
    // finish-signup or into the app.
    await loginWithGoogle();
  };

  const loginWithEmail = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isOffline) return;
    if (loginLoading) return;

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

      // After successful login, navigate to the intended page.
      router.push(nextPath);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoginLoading(false);
    }
  };

  const signupWithEmail = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isOffline) return;
    if (signupLoading) return;

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
          profileComplete: true,
          needsHowToPlay: true,
          email,
          providers: ["password"]
        },
        { merge: true }
      );

      setSignupDisplayName("");
      setSignupEmail("");
      setSignupPassword("");

      router.push(nextPath);
    } catch (err) {
      setSignupError(err instanceof Error ? err.message : "Sign up failed.");
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <main>
      <header>
        <h1 style={{ marginBottom: 8 }}>Log in</h1>

        {isOffline ? (
          <p role="status" style={{ marginBottom: 16 }}>
            Cloud sync is unavailable right now. Login and signup are
            temporarily unavailable, but you can still{" "}
            <Link
              style={{
                textDecoration: "underline"
              }}
              href={nextPath}
            >
              continue as a guest
            </Link>{" "}
            and play locally on this device.
          </p>
        ) : (
          <>
            <p style={{ marginBottom: 16 }}>
              <Link
                style={{
                  textDecoration: "underline"
                }}
                href={nextPath}
              >
                Continue as a guest
              </Link>{" "}
              to play locally on this device. Log in to unlock stats,
              leaderboard, and sync across devices.
            </p>
            <p style={{ marginBottom: 16, opacity: 0.8 }}>
              After you choose an option, we’ll send you back to{" "}
              <code>{nextPath}</code>.
            </p>
          </>
        )}
      </header>

      {hydrated && uid && (
        <p style={{ marginBottom: 16 }}>
          Current session: <strong>{isUser ? "User" : "Guest"}</strong>
          <span style={{ opacity: 0.7 }}> (uid: {uid.slice(0, 8)}…)</span>
        </p>
      )}

      {!isOffline && (
        <div>
          <section
            style={{
              display: "flex",
              gap: "12px"
            }}
          >
            <div style={{ flex: 1 }}>
              <button
                title="Log in and continue"
                onClick={loginAndContinue}
                type="button"
                className="btn btn--primary"
                disabled={isOffline}
              >
                Log in or sign up with Google
              </button>
            </div>
            <div
              aria-hidden="true"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--muted)",
                fontSize: 14,
                width: 70
              }}
            >
              <span
                style={{
                  flex: 1,
                  height: 1,
                  background: "currentColor",
                  opacity: 0.3
                }}
              />
              <span>or</span>
              <span
                style={{
                  flex: 1,
                  height: 1,
                  background: "currentColor",
                  opacity: 0.3
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <form onSubmit={loginWithEmail} style={{ maxWidth: 520 }}>
                <h2 style={{ marginBottom: 8, fontSize: 18 }}>
                  Log in with email
                </h2>
                <p style={{ marginBottom: 12, opacity: 0.8 }}>
                  Existing user? Log in with email + password.
                </p>

                <label style={{ display: "block", marginBottom: 10 }}>
                  <span style={{ display: "block", marginBottom: 6 }}>
                    Email
                  </span>
                  <input
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="control"
                    type="email"
                    disabled={isOffline}
                  />
                </label>

                <label style={{ display: "block", marginBottom: 14 }}>
                  <span style={{ display: "block", marginBottom: 6 }}>
                    Password
                  </span>
                  <input
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Your password"
                    className="control"
                    type="password"
                    disabled={isOffline}
                  />
                </label>

                {loginError && (
                  <p role="alert" style={{ marginBottom: 12 }}>
                    {loginError}
                  </p>
                )}

                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={isOffline || !canSubmitLogin || loginLoading}
                >
                  {loginLoading ? "Logging in…" : "Log in"}
                </button>
                <div style={{ marginTop: 10 }}>
                  <Link
                    href={`/forgot-password?next=${encodeURIComponent(nextPath)}`}
                    style={{ textDecoration: "underline", fontSize: 14 }}
                  >
                    Forgot password?
                  </Link>
                </div>
              </form>
            </div>
          </section>
          <section>
            {" "}
            <h2 style={{ marginBottom: 8, fontSize: 18 }}>
              Sign up with email
            </h2>
            <p style={{ marginBottom: 12, opacity: 0.8 }}>
              Create an account with email/password.
            </p>
            <form onSubmit={signupWithEmail} style={{ maxWidth: 520 }}>
              <label style={{ display: "block", marginBottom: 10 }}>
                <span style={{ display: "block", marginBottom: 6 }}>
                  Display name
                </span>
                <input
                  value={signupDisplayName}
                  onChange={(e) => setSignupDisplayName(e.target.value)}
                  autoComplete="nickname"
                  placeholder="e.g., Jude"
                  className="control"
                  type="text"
                  disabled={isOffline}
                />
              </label>

              <label style={{ display: "block", marginBottom: 10 }}>
                <span style={{ display: "block", marginBottom: 6 }}>Email</span>
                <input
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="control"
                  type="email"
                  disabled={isOffline}
                />
              </label>

              <label style={{ display: "block", marginBottom: 14 }}>
                <span style={{ display: "block", marginBottom: 6 }}>
                  Password
                </span>
                <input
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="6+ characters"
                  className="control"
                  type="password"
                  disabled={isOffline}
                />
              </label>

              {signupError && (
                <p role="alert" style={{ marginBottom: 12 }}>
                  {signupError}
                </p>
              )}

              <button
                type="submit"
                className="btn btn--primary"
                disabled={isOffline || !canSubmitSignup || signupLoading}
              >
                {signupLoading ? "Creating account…" : "Create account"}
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
