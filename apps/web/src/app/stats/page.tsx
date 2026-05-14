"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Button, Panel } from "@vcell/ui";
import { useSession } from "@/state/auth/AuthProvider";
import { selectCompletedGames } from "@/state/records/recordsSlice";
import { useSelector } from "react-redux";
import { selectDisplayName, selectEmail } from "@/state/auth/authSlice";
import { formatDate } from "@/ui/utils";
import StatsTabs from "./StatsTabs";

export default function StatsPage() {
  const { isUser, hydrated } = useSession();
  // auth slice
  const displayName = useSelector(selectDisplayName);
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
    const winRate100 =
      last100Count === 0
        ? "0"
        : Number(((last100Wins / last100Count) * 100).toFixed(2)).toString();

    const wins = ended.filter((g) => g.status === "won");
    const allTimeCount = ended.length;
    const allTimeWins = wins.length;
    const winRateAllTime =
      allTimeCount === 0
        ? "0"
        : Number(((allTimeWins / allTimeCount) * 100).toFixed(2)).toString();

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
      winRate: winRate100,
      allTimeCount,
      allTimeWins,
      winRateAllTime,
      fastest,
      fewestMoves
    };
  }, [games]);

  return (
    <>
      <header>
        <h1 style={{ textAlign: "center" }}>Stats</h1>
      </header>
      <main className="stats-page-main">
        {/* left sidebar  */}
        <Panel
          as="section"
          padding="lg"
          style={{
            height: "fit-content"
          }}
        >
          <h2
            style={{
              marginBottom: "0.5rem"
            }}
          >
            {displayName ? `${displayName}` : "Playing as Guest"}
          </h2>
          {email && <p>{email}</p>}
          <br />
          <hr />
          <br />
          <br />

          {!hydrated ? (
            <p style={{ opacity: 0.75 }}>Loading session…</p>
          ) : isUser ? (
            <>
              <h3 style={{ marginBottom: 8 }}>Win rate (last 100 games)</h3>
              <p style={{ marginTop: 0, marginBottom: "2rem" }}>
                <strong>{derived.winRate}%</strong> ({derived.last100Wins} wins
                out of {derived.last100Count} games)
              </p>

              <h3 style={{ marginBottom: 8 }}>Win rate (all time)</h3>
              <p style={{ marginTop: 0, marginBottom: "2rem" }}>
                <strong>{derived.winRateAllTime}%</strong> (
                {derived.allTimeWins} wins out of {derived.allTimeCount} games)
              </p>

              <h3 style={{ marginBottom: 8 }}>Total Completed Games</h3>
              <p style={{ marginTop: 0 }}>
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
            </>
          ) : (
            <>
              <p style={{ opacity: 0.85, marginBottom: "16px" }}>
                Viewing local stats saved on this device. Log in if you want
                your history to sync across devices.
              </p>
              <Button as={Link} href="/login?next=/stats">
                Log in for synced stats
              </Button>
            </>
          )}
        </Panel>

        {!hydrated ? null : <StatsTabs derived={derived} />}
      </main>
    </>
  );
}
