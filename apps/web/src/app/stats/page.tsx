"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@vcell/ui";
import { useSession } from "@/state/auth/AuthProvider";
import { selectCompletedGames } from "@/state/records/recordsSlice";
import UserStatsTables from "@/ui/UserStatsTables";
import { useSelector } from "react-redux";
import { selectDisplayName } from "@/state/auth/authSlice";
import { formatDate } from "@/ui/utils";

export default function StatsPage() {
  const { isUser, hydrated } = useSession();
  // auth slice
  const displayName = useSelector(selectDisplayName);
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
    <main className="stats-page-main">
      {/* left sidebar  */}
      <section
        className="paper paper-padding"
        style={{
          flex: "1 1 320px",
          height: "fit-content"
        }}
      >
        <h1>{displayName ? `${displayName}` : "Playing as Guest"}</h1>
        <hr />
        <br />
        <br />

        {!hydrated ? (
          <p style={{ opacity: 0.75 }}>Loading session…</p>
        ) : isUser ? (
          <>
            <h2 style={{ marginBottom: 8 }}>Completed Games</h2>
            <p style={{ marginTop: 0, marginBottom: "2rem" }}>
              {derived.ended.length === 0 ? (
                <strong>No games finished yet.</strong>
              ) : (
                <>
                  <strong>{derived.ended.length}</strong> completed game
                  {derived.ended.length > 1 ? "s" : ""} since{" "}
                  {formatDate(
                    derived.ended[derived.ended.length - 1]?.endedAtMs ?? 0
                  )}
                </>
              )}
            </p>

            <h2 style={{ marginBottom: 8 }}>Win rate (last 100 games)</h2>
            <p style={{ marginTop: 0 }}>
              <strong>{derived.winRate}%</strong> ({derived.last100Wins} wins
              out of {derived.last100Count} games)
            </p>
          </>
        ) : (
          <>
            <p style={{ opacity: 0.85, marginBottom: "16px" }}>
              Viewing local stats saved on this device. Log in if you want your
              history to sync across devices.
            </p>
            <Button as={Link} href="/login?next=/stats">
              Log in for synced stats
            </Button>
          </>
        )}
      </section>

      {!hydrated ? null : <UserStatsTables derived={derived} />}
    </main>
  );
}
