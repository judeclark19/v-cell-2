"use client";

import Link from "next/link";
import { useMemo } from "react";
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
        ) : isUser ? (
          <>
            <p style={{ opacity: 0.85, marginTop: 0 }}>
              Signed in as <strong>{displayName ?? email ?? "User"}</strong>.
            </p>
          </>
        ) : (
          <>
            <p style={{ opacity: 0.85, marginBottom: "16px" }}>
              Viewing local stats saved on this device. Log in if you want your
              history to sync across devices.
            </p>
            <Link href="/login?next=/stats" className="btn btn--primary">
              Log in for synced stats
            </Link>
          </>
        )}
      </header>

      <div style={{ margin: "12px 0 20px" }} />

      {!hydrated ? null : <UserStatsTables derived={derived} />}
    </main>
  );
}
