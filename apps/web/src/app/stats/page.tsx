"use client";

import Link from "next/link";
import { useSession } from "@/state/session/SessionProvider";

export default function StatsPage() {
  const { isUser } = useSession();

  if (!isUser) {
    return (
      <div>
        <h1>Stats</h1>
        <p>
          Stats and leaderboards are tied to an account so they can sync across
          devices. You can keep playing as a guest, but you’ll need to log in to
          view stats here.
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 12,
            alignItems: "center"
          }}
        >
          {/* Temporary dev login until we wire real auth */}

          <Link
            href="/login?next=/stats"
            style={{ textDecoration: "underline" }}
          >
            Login
          </Link>
          <Link href="/" style={{ textDecoration: "underline" }}>
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Stats Page</h1>
      <p>Coming soon...</p>
    </div>
  );
}
