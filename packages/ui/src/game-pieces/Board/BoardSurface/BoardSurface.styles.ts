"use client";

import styled from "styled-components";

export const BoardSurfaceRoot = styled.div`
  container-type: inline-size;
  --card-w: calc((100cqw - 8px - (6 * var(--card-gap, 10px))) / 7);

  height: var(--board-h);
  width: 100%;
  aspect-ratio: 3 / 4;
  background-color: var(--board-bg);
  padding: 4px;
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
`;
