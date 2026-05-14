import { PersistedGame } from "@/persistence/types";
import {
  UserStatsTable,
  UserStatsTableCell,
  UserStatsTableEmpty,
  UserStatsTableHeaderCell,
  UserStatsTableHeading,
  UserStatsTableRow,
  UserStatsTableScroller,
  UserStatsTablesRoot
} from "@vcell/ui";
import SeedButton from "./SeedButton";
import { formatDateAndTime, formatElapsed } from "./utils";

export type GameStats = {
  winRate: string;
  last100Wins: number;
  last100Count: number;
  fastest: PersistedGame[];
  fewestMoves: PersistedGame[];
  ended: PersistedGame[];
};

const renderGamesTable = (
  rows: PersistedGame[],
  kind: "fastest" | "fewestMoves"
) => {
  const isFastest = kind === "fastest";

  return (
    <UserStatsTableScroller>
      <UserStatsTable>
        <thead>
          <UserStatsTableRow>
            <UserStatsTableHeaderCell>Rank</UserStatsTableHeaderCell>
            {isFastest ? (
              <UserStatsTableHeaderCell>Elapsed</UserStatsTableHeaderCell>
            ) : (
              <UserStatsTableHeaderCell>Moves</UserStatsTableHeaderCell>
            )}
            <UserStatsTableHeaderCell>Date completed</UserStatsTableHeaderCell>
            {isFastest ? (
              <UserStatsTableHeaderCell>Moves</UserStatsTableHeaderCell>
            ) : (
              <UserStatsTableHeaderCell>Elapsed</UserStatsTableHeaderCell>
            )}
            <UserStatsTableHeaderCell>Seed</UserStatsTableHeaderCell>
          </UserStatsTableRow>
        </thead>
        <tbody>
          {rows.slice(0, 10).map((g, index) => (
            <UserStatsTableRow key={g.sessionId}>
              <UserStatsTableCell>
                <strong>{index + 1}</strong>
              </UserStatsTableCell>

              {isFastest ? (
                <UserStatsTableCell>
                  {formatElapsed(g.timeElapsedMs)}
                </UserStatsTableCell>
              ) : (
                <UserStatsTableCell>
                  {typeof g.moveCount === "number" ? g.moveCount : "—"}
                </UserStatsTableCell>
              )}

              <UserStatsTableCell>
                {formatDateAndTime(g.endedAtMs)}
              </UserStatsTableCell>

              {isFastest ? (
                <UserStatsTableCell>
                  {typeof g.moveCount === "number" ? g.moveCount : "—"}
                </UserStatsTableCell>
              ) : (
                <UserStatsTableCell>
                  {formatElapsed(g.timeElapsedMs)}
                </UserStatsTableCell>
              )}

              <UserStatsTableCell>
                {typeof g.seed === "string" ? (
                  <SeedButton seed={g.seed} />
                ) : (
                  "—"
                )}
              </UserStatsTableCell>
            </UserStatsTableRow>
          ))}
        </tbody>
      </UserStatsTable>
    </UserStatsTableScroller>
  );
};

function UserStatsTables({ derived }: { derived: GameStats }) {
  return (
    <UserStatsTablesRoot>
      <UserStatsTableHeading>Fastest wins</UserStatsTableHeading>
      {derived.fastest.length === 0 ? (
        <UserStatsTableEmpty>No wins yet.</UserStatsTableEmpty>
      ) : (
        renderGamesTable(derived.fastest, "fastest")
      )}

      <UserStatsTableHeading>Fewest moves (wins)</UserStatsTableHeading>
      {derived.fewestMoves.length === 0 ? (
        <UserStatsTableEmpty>No wins yet.</UserStatsTableEmpty>
      ) : (
        renderGamesTable(derived.fewestMoves, "fewestMoves")
      )}

      <UserStatsTableHeading>Most recent completed games</UserStatsTableHeading>
      {derived.ended.length === 0 ? (
        <UserStatsTableEmpty>No completed games yet.</UserStatsTableEmpty>
      ) : (
        <UserStatsTableScroller>
          <UserStatsTable>
            <thead>
              <UserStatsTableRow>
                <UserStatsTableHeaderCell>
                  Date completed
                </UserStatsTableHeaderCell>
                <UserStatsTableHeaderCell>Status</UserStatsTableHeaderCell>
                <UserStatsTableHeaderCell>Elapsed</UserStatsTableHeaderCell>
                <UserStatsTableHeaderCell>Moves</UserStatsTableHeaderCell>
                <UserStatsTableHeaderCell>Seed</UserStatsTableHeaderCell>
              </UserStatsTableRow>
            </thead>
            <tbody>
              {derived.ended.slice(0, 10).map((g) => (
                <UserStatsTableRow key={g.sessionId}>
                  <UserStatsTableCell>
                    {formatDateAndTime(g.endedAtMs)}
                  </UserStatsTableCell>
                  <UserStatsTableCell>{g.status}</UserStatsTableCell>
                  <UserStatsTableCell>
                    {formatElapsed(g.timeElapsedMs)}
                  </UserStatsTableCell>
                  <UserStatsTableCell>
                    {typeof g.moveCount === "number" ? g.moveCount : "—"}
                  </UserStatsTableCell>
                  <UserStatsTableCell>
                    {typeof g.seed === "string" ? (
                      <SeedButton seed={g.seed} />
                    ) : (
                      "—"
                    )}
                  </UserStatsTableCell>
                </UserStatsTableRow>
              ))}
            </tbody>
          </UserStatsTable>
        </UserStatsTableScroller>
      )}
    </UserStatsTablesRoot>
  );
}

export default UserStatsTables;
