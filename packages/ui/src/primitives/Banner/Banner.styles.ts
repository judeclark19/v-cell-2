"use client";

import styled, { css } from "styled-components";

type BannerRootProps = {
  $sticky: boolean;
  $tone: "prompt" | "status";
};

const toneStyles = {
  prompt: css`
    border-bottom: 1px solid var(--banner-prompt-border);
    background: var(--banner-prompt-bg);
  `,
  status: css`
    border-bottom: 1px solid var(--banner-status-border);
    background: var(--banner-status-bg);
  `
} satisfies Record<BannerRootProps["$tone"], ReturnType<typeof css>>;

export const BannerRoot = styled.div<BannerRootProps>`
  ${({ $sticky }) =>
    $sticky
      ? css`
          position: sticky;
          top: var(--nav-height, 56px);
          z-index: calc(var(--z-navbar, 400) - 1);
        `
      : ""}

  backdrop-filter: blur(8px);
  ${({ $tone }) => toneStyles[$tone]}
`;

export const BannerInner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px;

  @media (max-width: 700px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

export const BannerText = styled.p`
  margin: 0;
  color: var(--foreground);
  font-size: 0.94rem;
  line-height: 1.4;
  text-wrap: balance;

  @media (max-width: 640px) {
    padding: 0;
    font-size: 0.9rem;
  }
`;

export const BannerActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;

  @media (max-width: 700px) {
    justify-content: flex-end;
  }
`;
