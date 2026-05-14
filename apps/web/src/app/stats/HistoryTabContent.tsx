"use client";

import {
  Button,
  UserStatsTable,
  UserStatsTableCell,
  UserStatsTableEmpty,
  UserStatsTableHeaderCell,
  UserStatsTableRow,
  UserStatsTableScroller
} from "@vcell/ui";
import { useMemo } from "react";
import styled from "styled-components";
import SeedButton from "@/ui/SeedButton";
import { formatDateAndTime, formatElapsed } from "@/ui/utils";
import type { GameStats } from "@/ui/UserStatsTables";
import {
  buildPaginationItems,
  type PaginationItem
} from "./historyPagination";

const HistoryBody = styled.div`
  display: grid;
  gap: 1rem;
`;

const HistoryHeading = styled.h2`
  margin-bottom: 0;
`;

const HistoryMeta = styled.p`
  color: var(--muted);
  margin: 0;
`;

const PaginationRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
`;

const PaginationButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const HistoryTableCell = styled(UserStatsTableCell)`
  white-space: nowrap;
`;

const PAGE_SIZE = 25;

function HistoryPagination({
  page,
  totalPages,
  paginationItems,
  onPageChange
}: {
  page: number;
  totalPages: number;
  paginationItems: PaginationItem[];
  onPageChange: (page: number | ((current: number) => number)) => void;
}) {
  return (
    <PaginationButtons>
      <Button
        variant="ghost"
        disabled={page === 1}
        onClick={() => onPageChange((current) => Math.max(1, current - 1))}
      >
        Previous
      </Button>
      {paginationItems.map((item) =>
        item.type === "ellipsis" ? (
          <HistoryMeta key={item.key} aria-hidden="true">
            ...
          </HistoryMeta>
        ) : (
          <Button
            key={item.value}
            variant={item.value === page ? "secondary" : "ghost"}
            active={item.value === page}
            onClick={() => onPageChange(item.value)}
          >
            {item.value}
          </Button>
        )
      )}
      <Button
        variant="ghost"
        disabled={page === totalPages}
        onClick={() => onPageChange((current) => Math.min(totalPages, current + 1))}
      >
        Next
      </Button>
    </PaginationButtons>
  );
}

export const HISTORY_PAGE_SIZE = PAGE_SIZE;

export default function HistoryTabContent({
  games,
  page,
  onPageChange
}: {
  games: GameStats["ended"];
  page: number;
  onPageChange: (page: number | ((current: number) => number)) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(games.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return games.slice(start, start + PAGE_SIZE);
  }, [currentPage, games]);

  const paginationItems = useMemo(
    () => buildPaginationItems(currentPage, totalPages),
    [currentPage, totalPages]
  );

  return (
    <HistoryBody>
      <HistoryHeading>All games</HistoryHeading>
      <PaginationRow>
        <HistoryMeta>
          {games.length} total games. Page {currentPage} of {totalPages}.
        </HistoryMeta>
        <HistoryPagination
          page={currentPage}
          totalPages={totalPages}
          paginationItems={paginationItems}
          onPageChange={onPageChange}
        />
      </PaginationRow>

      {games.length === 0 ? (
        <UserStatsTableEmpty>No completed games yet.</UserStatsTableEmpty>
      ) : (
        <>
          <UserStatsTableScroller>
            <UserStatsTable>
              <thead>
                <UserStatsTableRow>
                  <UserStatsTableHeaderCell>Date completed</UserStatsTableHeaderCell>
                  <UserStatsTableHeaderCell>Status</UserStatsTableHeaderCell>
                  <UserStatsTableHeaderCell>Elapsed</UserStatsTableHeaderCell>
                  <UserStatsTableHeaderCell>Moves</UserStatsTableHeaderCell>
                  <UserStatsTableHeaderCell>Seed</UserStatsTableHeaderCell>
                </UserStatsTableRow>
              </thead>
              <tbody>
                {pageRows.map((g) => (
                  <UserStatsTableRow key={g.sessionId}>
                    <HistoryTableCell>
                      {formatDateAndTime(g.endedAtMs)}
                    </HistoryTableCell>
                    <HistoryTableCell>{g.status}</HistoryTableCell>
                    <HistoryTableCell>
                      {formatElapsed(g.timeElapsedMs)}
                    </HistoryTableCell>
                    <HistoryTableCell>
                      {typeof g.moveCount === "number" ? g.moveCount : "—"}
                    </HistoryTableCell>
                    <HistoryTableCell>
                      {typeof g.seed === "string" ? (
                        <SeedButton seed={g.seed} />
                      ) : (
                        "—"
                      )}
                    </HistoryTableCell>
                  </UserStatsTableRow>
                ))}
              </tbody>
            </UserStatsTable>
          </UserStatsTableScroller>

          <PaginationRow>
            <HistoryMeta>
              Page {currentPage} of {totalPages}.
            </HistoryMeta>
            <HistoryPagination
              page={currentPage}
              totalPages={totalPages}
              paginationItems={paginationItems}
              onPageChange={onPageChange}
            />
          </PaginationRow>
        </>
      )}
    </HistoryBody>
  );
}
