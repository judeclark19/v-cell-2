"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/state/session/SessionProvider";
import { useAuthSession } from "@/lib/useAuthSession";
import { getAllCompletedGames } from "@/persistence/completedGamesStore";
import type { PersistedGame } from "@/persistence/types";
import UserStatsTables from "@/ui/UserStatsTables";

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
        <UserStatsTables derived={derived} />
      )}
    </main>
  );
}
