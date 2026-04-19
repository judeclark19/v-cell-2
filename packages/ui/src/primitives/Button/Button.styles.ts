"use client";

import styled, { css } from "styled-components";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export type ButtonSize = "md" | "lg";

type StyledButtonProps = {
  $fullWidth: boolean;
  $size: ButtonSize;
  $variant: ButtonVariant;
};

const variantStyles = {
  primary: css`
    background: var(--btn-primary-bg);
    color: var(--btn-primary-fg);
    border-color: color-mix(in srgb, var(--btn-primary-bg) 55%, var(--border));

    &:not(:disabled):hover {
      background: color-mix(in srgb, var(--btn-primary-bg) 92%, white 8%);
    }
  `,
  secondary: css`
    background: var(--btn-secondary-bg);
    color: var(--btn-secondary-fg);

    &:not(:disabled):hover {
      background: color-mix(
        in srgb,
        var(--btn-secondary-bg) 85%,
        var(--surface-hover)
      );
      border-color: color-mix(in srgb, var(--border) 70%, var(--accent));
    }
  `,
  ghost: css`
    background: var(--btn-ghost-bg, transparent);
    color: var(--btn-ghost-fg, var(--foreground));

    &:not(:disabled):hover {
      background: color-mix(
        in srgb,
        var(--btn-ghost-bg, transparent) 80%,
        var(--surface-hover)
      );
      border-color: color-mix(in srgb, var(--border) 70%, var(--accent));
    }
  `
} satisfies Record<ButtonVariant, ReturnType<typeof css>>;

const sizeStyles = {
  md: css`
    padding: 8px 12px;
  `,
  lg: css`
    padding: 10px 14px;
  `
} satisfies Record<ButtonSize, ReturnType<typeof css>>;

export const ButtonRoot = styled.button<StyledButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: ${({ $fullWidth }) => ($fullWidth ? "100%" : "auto")};

  border-radius: var(--btn-radius);
  border: 1px solid var(--btn-border);
  cursor: pointer;
  font: inherit;
  line-height: 1;
  text-align: center;
  transition:
    transform 120ms ease,
    background 120ms ease,
    border-color 120ms ease,
    opacity 120ms ease;

  ${({ $size }) => sizeStyles[$size]}
  ${({ $variant }) => variantStyles[$variant]}

  &:active {
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
  }
`;
