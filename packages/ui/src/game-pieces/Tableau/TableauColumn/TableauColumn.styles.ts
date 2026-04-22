"use client";

import styled from "styled-components";

export const TableauColumnRoot = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: calc(var(--card-w) * 1.5);

  > [data-card-root],
  > [data-card-slot] {
    position: relative;
    z-index: 1;
  }

  > [data-card-locked="true"] {
    pointer-events: none;
  }

  > :is([data-card-root], [data-card-slot])
    + :is([data-card-root], [data-card-slot]) {
    margin-top: -107%;
  }

  > :is([data-card-dragging="true"], [data-card-auto-moving="true"]) {
    margin-top: 0;
  }
`;

export const TableauEmptySlotRoot = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  aspect-ratio: 2 / 3;
  z-index: var(--z-base, 0);

  > [data-card-root],
  > [data-card-slot] {
    width: 100%;
    height: 100%;
  }
`;
