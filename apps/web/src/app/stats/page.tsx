"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/state/session/SessionProvider";
import { useAuthSession } from "@/lib/useAuthSession";
import { getAllCompletedGames } from "@/persistence/completedGamesStore";
import type { PersistedGame } from "@/persistence/types";
import { formatElapsed } from "@/features/game-board/utils/formatElapsed";
import SeedButton from "@/ui/SeedButton";

export default function StatsPage() {
  const { isUser, uid, hydrated } = useSession();
  const { user } = useAuthSession();
  const displayName = user?.displayName ?? user?.email ?? "User";

  const [games, setGames] = useState<PersistedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Stats are only for logged-in users.
    if (!hydrated) return;
    if (!isUser) {
      setGames([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const all = await getAllCompletedGames();
        if (cancelled) return;

        // Defensive: ensure we have an array
        setGames(Array.isArray(all) ? all : []);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, isUser]);

  const formatDate = (ms: number | null | undefined) => {
    if (typeof ms !== "number" || !Number.isFinite(ms)) return "—";
    return new Date(ms).toLocaleString();
  };

  const derived = useMemo(() => {
    const ended = games
      .filter((g) => typeof g.endedAtMs === "number" && g.endedAtMs)
      .slice()
      .sort((a, b) => (b.endedAtMs ?? 0) - (a.endedAtMs ?? 0));

    // We store only completed games in this store, but status may be "won" or "abandoned".
    const last100 = ended.slice(0, 100);
    const last100Count = last100.length;
    const last100Wins = last100.filter((g) => g.status === "won").length;
    const winRate =
      last100Count === 0 ? 0 : Math.round((last100Wins / last100Count) * 100);

    const wins = ended.filter((g) => g.status === "won");

    const fastest = wins
      .filter((g) => typeof g.timeElapsedMs === "number")
      .slice()
      .sort(
        (a, b) =>
          (a.timeElapsedMs ?? Number.POSITIVE_INFINITY) -
          (b.timeElapsedMs ?? Number.POSITIVE_INFINITY)
      )
      .slice(0, 10);

    const fewestMoves = wins
      .filter((g) => typeof g.moveCount === "number")
      .slice()
      .sort(
        (a, b) =>
          (a.moveCount ?? Number.POSITIVE_INFINITY) -
          (b.moveCount ?? Number.POSITIVE_INFINITY)
      )
      .slice(0, 10);

    return {
      ended,
      last100Count,
      last100Wins,
      winRate,
      fastest,
      fewestMoves
    };
  }, [games]);

  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse"
  };

  const thTdStyle: React.CSSProperties = {
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    padding: "8px 6px",
    textAlign: "left"
  };

  const renderGamesTable = (rows: PersistedGame[]) => (
    <table style={tableStyle}>
      <thead>
        <tr>
          <th style={thTdStyle}>Seed</th>
          <th style={thTdStyle}>Date completed</th>
          <th style={thTdStyle}>Moves</th>
          <th style={thTdStyle}>Elapsed</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((g) => (
          <tr key={g.gameId}>
            <td style={thTdStyle}>
              {typeof g.seed === "string" ? <SeedButton seed={g.seed} /> : "—"}
            </td>
            <td style={thTdStyle}>{formatDate(g.endedAtMs)}</td>
            <td style={thTdStyle}>
              {typeof g.moveCount === "number" ? g.moveCount : "—"}
            </td>
            <td style={thTdStyle}>{formatElapsed(g.timeElapsedMs)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <main>
      <header>
        <h1>Stats</h1>

        {!hydrated ? (
          <p style={{ opacity: 0.75 }}>Loading session…</p>
        ) : !isUser ? (
          <>
            <p style={{ opacity: 0.85, marginBottom: "16px" }}>
              Stats are available for logged-in users only.
            </p>
            <Link href="/login?next=/stats" className="btn btn--primary">
              Log in to view your stats
            </Link>
          </>
        ) : (
          <>
            <p style={{ opacity: 0.85, marginTop: 0 }}>
              Signed in as <strong>{displayName}</strong>.
            </p>
            {uid && <p style={{ opacity: 0.65 }}>uid: {uid}</p>}
          </>
        )}
      </header>

      <div style={{ margin: "12px 0 20px" }} />

      {!hydrated || !isUser ? null : loading ? (
        <p>Loading completed games…</p>
      ) : error ? (
        <p style={{ color: "tomato" }}>Error loading games: {error}</p>
      ) : (
        <>
          <section style={{ marginBottom: 24 }}>
            <h2 style={{ marginBottom: 8 }}>Win rate (last 100 games)</h2>
            <p style={{ marginTop: 0 }}>
              <strong>{derived.winRate}%</strong> ({derived.last100Wins} wins
              out of {derived.last100Count} games)
            </p>
          </section>

          <section style={{ marginBottom: 24 }}>
            <h2 style={{ marginBottom: 8 }}>Fastest wins</h2>
            {derived.fastest.length === 0 ? (
              <p style={{ marginTop: 0, opacity: 0.8 }}>No wins yet.</p>
            ) : (
              renderGamesTable(derived.fastest)
            )}
          </section>

          <section style={{ marginBottom: 24 }}>
            <h2 style={{ marginBottom: 8 }}>Fewest moves (wins)</h2>
            {derived.fewestMoves.length === 0 ? (
              <p style={{ marginTop: 0, opacity: 0.8 }}>No wins yet.</p>
            ) : (
              renderGamesTable(derived.fewestMoves)
            )}
          </section>

          <section style={{ marginBottom: 24 }}>
            <h2 style={{ marginBottom: 8 }}>Most recent completed games</h2>
            {derived.ended.length === 0 ? (
              <p style={{ marginTop: 0, opacity: 0.8 }}>
                No completed games yet.
              </p>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thTdStyle}>Seed</th>
                    <th style={thTdStyle}>Date completed</th>
                    <th style={thTdStyle}>Moves</th>
                    <th style={thTdStyle}>Elapsed</th>
                    <th style={thTdStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {derived.ended.slice(0, 10).map((g) => (
                    <tr key={g.gameId}>
                      <td style={thTdStyle}>
                        {typeof g.seed === "string" ? (
                          <SeedButton seed={g.seed} />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={thTdStyle}>{formatDate(g.endedAtMs)}</td>
                      <td style={thTdStyle}>
                        {typeof g.moveCount === "number" ? g.moveCount : "—"}
                      </td>
                      <td style={thTdStyle}>
                        {formatElapsed(g.timeElapsedMs)}
                      </td>
                      <td style={thTdStyle}>{g.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </main>
  );
}
