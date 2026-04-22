"use client";

import styled from "styled-components";

export const PileCellRoot = styled.div`
  position: relative;
`;

export const PileSpacerRoot = styled.div`
  width: 100%;
  aspect-ratio: 2 / 3;

  // styles for the reset and undo buttons
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  > button {
    flex: 1 1 0;
    min-height: 0;
    padding: 0;
    width: 100%;
  }
`;
