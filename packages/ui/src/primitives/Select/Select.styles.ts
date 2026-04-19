"use client";

import styled from "styled-components";

export const SelectRoot = styled.select`
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;

  width: 100%;
  min-height: 34px;
  padding: 8px 2.25rem 8px 10px;

  border-radius: var(--control-radius);
  border: 1px solid var(--control-border);
  background-color: var(--control-bg);
  background-image: var(--select-chevron);
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 0.9rem;

  color: var(--control-fg);
  cursor: pointer;
  font: inherit;

  &:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
