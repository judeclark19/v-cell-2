"use client";

import styled, { css } from "styled-components";

type DragLayerRootProps = {
  $autoMoving: boolean;
};

export const DragLayerRoot = styled.div<DragLayerRootProps>`
  position: fixed;
  z-index: var(--z-drag);
  pointer-events: none;
  will-change: transform;
  width: var(--card-w);
  height: auto;
  transition: none;

  ${({ $autoMoving }) =>
    $autoMoving
      ? css`
          transition: transform 180ms ease;

          :root[data-reduced-motion="true"] & {
            transition: none;
          }
        `
      : ""}
`;

export const DragLayerStackRoot = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;

  > .card:not(:first-child) {
    margin-top: calc(var(--card-w) * -1.07);
  }
`;
