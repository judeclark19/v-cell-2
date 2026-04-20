"use client";

import styled, { css } from "styled-components";

type TabsPanelGroupProps = {
  $animated: boolean;
};

type TabButtonProps = {
  $selected: boolean;
};

type TabPanelProps = {
  $padding: "none" | "md" | "lg";
};

const panelPaddingStyles = {
  none: css`
    padding: 0;
  `,
  md: css`
    padding: 16px;
  `,
  lg: css`
    padding: 40px;
    padding-top: 58px;

    @media (max-width: 640px) {
      padding: 16px;
      padding-top: 24px;
    }
  `
} satisfies Record<TabPanelProps["$padding"], ReturnType<typeof css>>;

export const TabsList = styled.div`
  display: flex;
`;

export const TabButton = styled.button<TabButtonProps>`
  flex: 1;
  min-height: 50px;
  padding: 12px 16px;

  background: transparent;
  border: none;
  border-bottom: 1px solid
    ${({ $selected }) =>
      $selected ? "var(--tabs-active-border)" : "var(--tabs-border)"};

  color: ${({ $selected }) =>
    $selected ? "var(--tabs-active-fg)" : "var(--tabs-fg)"};
  cursor: pointer;
  font: inherit;
  text-align: center;

  &:focus-visible {
    outline: none;
    box-shadow: inset 0 -2px 0 var(--tabs-active-border), var(--focus-ring);
  }
`;

export const TabsPanels = styled.div<TabsPanelGroupProps>`
  overflow: hidden;

  ${({ $animated }) =>
    $animated
      ? css`
          transition: height 220ms ease;
        `
      : ""}
`;

export const TabPanel = styled.section<TabPanelProps>`
  ${({ $padding }) => panelPaddingStyles[$padding]}
`;
