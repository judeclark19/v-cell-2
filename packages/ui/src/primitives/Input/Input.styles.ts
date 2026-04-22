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

export const PasswordInputRoot = styled.div<InputRootProps>`
  position: relative;
  width: ${({ $fullWidth }) => ($fullWidth ? "100%" : "auto")};
`;

export const PasswordInputField = styled(InputRoot)`
  padding-right: 44px;
  width: 100%;
`;

export const PasswordVisibilityButton = styled.button`
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: calc(var(--control-radius) - 2px);
  color: var(--muted);
  cursor: pointer;
  display: inline-flex;
  height: 32px;
  justify-content: center;
  padding: 0;
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;

  &:hover {
    color: var(--control-fg);
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;
