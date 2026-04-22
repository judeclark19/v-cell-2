"use client";

import styled from "styled-components";

export const PileCellRoot = styled.div`
  position: relative;
`;

export const PileSpacerRoot = styled.div`
  --pile-spacer-button-min-height: 40px;

  width: 100%;
  aspect-ratio: 2 / 3;
  min-height: calc((var(--pile-spacer-button-min-height) * 2) + 0.5rem);

  // styles for the reset and undo buttons
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  > button {
    flex: 1 1 0;
    min-height: var(--pile-spacer-button-min-height);
    padding: 0;
    width: 100%;
  }
`;
