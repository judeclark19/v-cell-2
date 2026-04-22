"use client";

import styled from "styled-components";

export const PileRowRoot = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--card-gap, 10px);
  box-sizing: border-box;
  padding: 4px;
  background-color: var(--board-bg);
  position: relative;
`;
