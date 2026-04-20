"use client";

import styled from "styled-components";

type InputRootProps = {
  $fullWidth: boolean;
};

export const InputRoot = styled.input<InputRootProps>`
  width: ${({ $fullWidth }) => ($fullWidth ? "100%" : "auto")};
  min-height: 34px;
  padding: 8px 10px;

  border-radius: var(--control-radius);
  border: 1px solid var(--control-border);
  background-color: var(--control-bg);

  color: var(--control-fg);
  font: inherit;

  &::placeholder {
    color: var(--muted);
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
