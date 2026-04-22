"use client";

import styled, { css } from "styled-components";

type AutocompleteDrawerRootProps = {
  $visible: boolean;
};

export const AutocompleteDrawerRoot = styled.div<AutocompleteDrawerRootProps>`
  position: absolute;
  top: 0;
  transform: translateY(0);
  transition: transform 180ms ease;
  will-change: transform;
  width: 100%;
  background-color: var(--board-bg);
  padding: 8px;
  display: flex;
  justify-content: center;

  ${({ $visible }) =>
    $visible
      ? css`
          z-index: var(--z-drag);
          transform: translateY(-100%);
        `
      : ""}

  :root[data-reduced-motion="true"] & {
    transition: none;
  }
`;
