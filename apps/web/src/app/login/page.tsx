"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/state/session/SessionProvider";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Where to return after login/guest selection.
  // Only allow internal paths.
  const rawNext = searchParams.get("next");
  const nextPath = rawNext && rawNext.startsWith("/") ? rawNext : "/game";

  const { isUser, logout, hydrated, uid, loginWithGoogle } = useSession();

  const continuePath = () => {
    router.push(nextPath);
  };

  const loginAndContinue = async () => {
    await loginWithGoogle();
    continuePath();
  };

  return (
    <div>
      <h1 style={{ marginBottom: 8 }}>Log in</h1>
      <p style={{ marginBottom: 16 }}>
        Continue as a guest to play locally on this device. Log in to unlock
        stats, leaderboard, and sync across devices.
      </p>
      <p style={{ marginBottom: 16, opacity: 0.8 }}>
        After you choose an option, we’ll send you back to{" "}
        <code>{nextPath}</code>.
      </p>

      {hydrated && uid && (
        <p style={{ marginBottom: 16 }}>
          Current session: <strong>{isUser ? "User" : "Guest"}</strong>
          <span style={{ opacity: 0.7 }}> (uid: {uid.slice(0, 8)}…)</span>
        </p>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          title="Log in and continue"
          onClick={loginAndContinue}
          type="button"
          className="btn btn--primary"
        >
          Log in or sign up with Google
        </button>

        <button
          onClick={continuePath}
          type="button"
          className="btn btn--secondary"
        >
          Continue as Guest
        </button>

        {isUser && (
          <button onClick={logout} style={{ padding: "10px 14px" }}>
            Log out
          </button>
        )}
      </div>
    </div>
  );
}
