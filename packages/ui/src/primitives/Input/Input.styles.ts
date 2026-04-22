"use client";

import styled from "styled-components";

type InputRootProps = {
  $fullWidth: boolean;
};

export const InputRoot = styled.input<InputRootProps>`
  box-sizing: border-box;
  width: ${({ $fullWidth }) => ($fullWidth ? "100%" : "auto")};
  min-height: 40px;
  padding: 0 10px;

  border-radius: var(--control-radius);
  border: 1px solid var(--control-border);
  background-color: var(--control-bg);

  color: var(--control-fg);
  font: inherit;
  line-height: 1;

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
