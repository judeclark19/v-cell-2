import { PersistedGame } from "@/persistence/types";
import SeedButton from "./SeedButton";
import { formatDate, formatDateAndTime, formatElapsed } from "./utils";

export type GameStats = {
  winRate: number;
  last100Wins: number;
  last100Count: number;
  fastest: PersistedGame[];
  fewestMoves: PersistedGame[];
  ended: PersistedGame[];
};

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
          <td style={thTdStyle}>{formatDateAndTime(g.endedAtMs)}</td>
          <td style={thTdStyle}>
            {typeof g.moveCount === "number" ? g.moveCount : "—"}
          </td>
          <td style={thTdStyle}>{formatElapsed(g.timeElapsedMs)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

function UserStatsTables({ derived }: { derived: GameStats }) {
  return (
    <>
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 8 }}>Number of games played</h2>
        <p style={{ marginTop: 0 }}>
          {derived.ended.length === 0 ? (
            <strong>No games finished yet.</strong>
          ) : (
            <>
              <strong>{derived.ended.length}</strong> completed games since{" "}
              {formatDate(
                derived.ended[derived.ended.length - 1]?.endedAtMs ?? 0
              )}
            </>
          )}
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 8 }}>Win rate (last 100 games)</h2>
        <p style={{ marginTop: 0 }}>
          <strong>{derived.winRate}%</strong> ({derived.last100Wins} wins out of{" "}
          {derived.last100Count} games)
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
          <p style={{ marginTop: 0, opacity: 0.8 }}>No completed games yet.</p>
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
                  <td style={thTdStyle}>{formatDateAndTime(g.endedAtMs)}</td>
                  <td style={thTdStyle}>
                    {typeof g.moveCount === "number" ? g.moveCount : "—"}
                  </td>
                  <td style={thTdStyle}>{formatElapsed(g.timeElapsedMs)}</td>
                  <td style={thTdStyle}>{g.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

export default UserStatsTables;
