import styled from "styled-components";

export const UserStatsTablesRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
`;

export const UserStatsTableHeading = styled.h2`
  margin-bottom: 8px;
`;

export const UserStatsTableEmpty = styled.p`
  margin-top: 0;
  opacity: 0.8;
`;

export const UserStatsTableScroller = styled.div`
  overflow-x: auto;
  width: 100%;
  -webkit-overflow-scrolling: touch;
`;

export const UserStatsTable = styled.table`
  border-collapse: separate;
  border-spacing: 0 8px;
  min-width: 560px;
  width: 100%;
`;

export const UserStatsTableRow = styled.tr`
  background-color: transparent;
`;

export const UserStatsTableCell = styled.td`
  background-color: color-mix(in srgb, var(--surface) 78%, transparent);
  padding: 10px 12px;
  text-align: left;

  &:first-child {
    border-bottom-left-radius: var(--radius);
    border-top-left-radius: var(--radius);
  }

  &:last-child {
    border-bottom-right-radius: var(--radius);
    border-top-right-radius: var(--radius);
  }
`;

export const UserStatsTableHeaderCell = styled.th`
  background-color: color-mix(in srgb, var(--surface) 92%, transparent);
  padding: 6px 12px;
  text-align: left;

  &:first-child {
    border-bottom-left-radius: var(--radius);
    border-top-left-radius: var(--radius);
  }

  &:last-child {
    border-bottom-right-radius: var(--radius);
    border-top-right-radius: var(--radius);
  }
`;
