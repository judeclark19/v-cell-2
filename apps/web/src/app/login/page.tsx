"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/state/session/SessionProvider";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Where to return after login/guest selection.
  // Only allow internal paths.
  const rawNext = searchParams.get("next");
  const nextPath = rawNext && rawNext.startsWith("/") ? rawNext : "/game";

  const { isUser, logout, hydrated, uid, isAnonymous } = useSession();

  const continuePath = () => {
    router.push(nextPath);
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
          Current session:{" "}
          <strong>
            {isUser ? "Logged in" : isAnonymous ? "Guest" : "User"}
          </strong>
          <span style={{ opacity: 0.7 }}> (uid: {uid.slice(0, 8)}…)</span>
        </p>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button onClick={continuePath} style={{ padding: "10px 14px" }}>
          Continue as Guest
        </button>

        <button
          disabled
          title="Login to sync coming soon"
          style={{ padding: "10px 14px", opacity: 0.5, cursor: "not-allowed" }}
        >
          Log in to Sync (coming soon)
        </button>

        {isUser && (
          <button onClick={logout} style={{ padding: "10px 14px" }}>
            Log out
          </button>
        )}
      </div>

      <p style={{ marginTop: 16 }}>
        <Link href="/">Back to home</Link>
      </p>

      <hr style={{ margin: "20px 0", opacity: 0.3 }} />

      <p style={{ opacity: 0.8, margin: 0 }}>
        Next: implement Google + Email/Password to upgrade from guest to user.
      </p>
    </div>
  );
}
