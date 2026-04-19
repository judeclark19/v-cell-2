"use client";

import styled, { css } from "styled-components";

export type PanelPadding = "none" | "md" | "lg";

type PanelRootProps = {
  $fullWidth: boolean;
  $maxWidth?: number | string;
  $padding: PanelPadding;
};

const paddingStyles = {
  none: css`
    padding: 0;
  `,
  md: css`
    padding: 16px;
  `,
  lg: css`
    padding: 40px;

    @media (max-width: 640px) {
      padding: 16px;
    }
  `
} satisfies Record<PanelPadding, ReturnType<typeof css>>;

export const PanelRoot = styled.section<PanelRootProps>`
  width: ${({ $fullWidth }) => ($fullWidth ? "100%" : "auto")};
  max-width: ${({ $maxWidth }) =>
    $maxWidth == null
      ? "none"
      : typeof $maxWidth === "number"
        ? `${$maxWidth}px`
        : $maxWidth};

  border-radius: var(--panel-radius);
  background: var(--panel-bg);
  box-shadow: var(--panel-shadow);

  ${({ $padding }) => paddingStyles[$padding]}
`;
