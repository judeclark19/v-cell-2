import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 16 }}>V-Cell</h1>

      <div style={{ display: "flex", gap: 12 }}>
        <Link href="/game">
          <button style={{ padding: "10px 16px" }}>Play as Guest</button>
        </Link>

        <button
          style={{ padding: "10px 16px" }}
          disabled
          title="Login coming soon"
        >
          Log in
        </button>
      </div>

      <p style={{ marginTop: 16, opacity: 0.7 }}>
        Guest players can play and change settings, but won’t have access to
        stats or leaderboards.
      </p>
    </main>
  );
}
