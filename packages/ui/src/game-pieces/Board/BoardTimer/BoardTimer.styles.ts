"use client";

import styled from "styled-components";

type BoardTimerTextRootProps = {
  $muted: boolean;
};

export const BoardTimerCellRoot = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
  grid-column: span 3;

  &[aria-hidden="true"] {
    visibility: hidden;
  }

  button {
    width: 50%;
  }
`;

export const BoardTimerTextRoot = styled.div<BoardTimerTextRootProps>`
  text-align: center;
  font-size: 24px;
  color: ${({ $muted }) => ($muted ? "var(--muted)" : "inherit")};
`;
