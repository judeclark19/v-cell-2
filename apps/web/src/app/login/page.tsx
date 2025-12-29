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

  const { setGuest, setUser, isUser, isGuest, logout } = useSession();

  const continueAsGuest = () => {
    setGuest();
    router.push(nextPath);
  };

  const loginDev = () => {
    setUser("dev");
    router.push(nextPath);
  };

  return (
    <div style={{ padding: 16, maxWidth: 560 }}>
      <h1 style={{ marginBottom: 8 }}>Log in</h1>
      <p style={{ marginBottom: 16 }}>
        Guests can play and change settings. Logging in unlocks stats +
        leaderboard and will eventually sync across devices.
      </p>
      <p style={{ marginBottom: 16, opacity: 0.8 }}>
        After you choose an option, we’ll send you back to{" "}
        <code>{nextPath}</code>.
      </p>

      {(isUser || isGuest) && (
        <p style={{ marginBottom: 16 }}>
          Current session:{" "}
          <strong>{isUser ? "Logged in (dev)" : "Guest"}</strong>
        </p>
      )}

      {isUser ? (
        <button onClick={logout} style={{ padding: "10px 14px" }}>
          Log out (dev)
        </button>
      ) : (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button onClick={continueAsGuest} style={{ padding: "10px 14px" }}>
            Continue as guest
          </button>

          <button onClick={loginDev} style={{ padding: "10px 14px" }}>
            Log in (dev)
          </button>
        </div>
      )}

      <p style={{ marginTop: 16 }}>
        <Link href="/">Back to home</Link>
      </p>

      <hr style={{ margin: "20px 0", opacity: 0.3 }} />

      <p style={{ opacity: 0.8, margin: 0 }}>
        Later: replace “Log in (dev)” with Google + Email/Password.
      </p>
    </div>
  );
}
