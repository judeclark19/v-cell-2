"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useSession } from "@/state/auth/AuthProvider";
import { selectCompletedGames } from "@/state/records/recordsSlice";
import UserStatsTables from "@/ui/UserStatsTables";
import { useSelector } from "react-redux";
import {
  selectDisplayName,
  selectEmail,
  selectUid
} from "@/state/auth/authSlice";

export default function StatsPage() {
  const { isUser, hydrated } = useSession();
  // auth slice
  const displayName = useSelector(selectDisplayName);
  const uid = useSelector(selectUid);
  const email = useSelector(selectEmail);
  // records slice
  const games = useSelector(selectCompletedGames);

  useEffect(() => {
    const statusCounts = games.reduce<Record<string, number>>((acc, game) => {
      const status = String(game.status ?? "(missing)");
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {});

    console.log("[stats] completed games snapshot", {
      totalGames: games.length,
      statusCounts
    });
  }, [games]);

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
              Signed in as <strong>{displayName ?? email ?? "User"}</strong>.
            </p>
            {uid && <p style={{ opacity: 0.65 }}>uid: {uid}</p>}
          </>
        )}
      </header>

      <div style={{ margin: "12px 0 20px" }} />

      {!hydrated || !isUser ? null : <UserStatsTables derived={derived} />}
    </main>
  );
}
