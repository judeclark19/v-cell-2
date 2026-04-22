"use client";

import styled from "styled-components";

export const SeedControlRoot = styled.div`
  position: relative;
  display: inline-flex;
`;

type SeedMenuRootProps = {
  $open: boolean;
};

export const SeedMenuRoot = styled.div<SeedMenuRootProps>`
  position: absolute;
  bottom: calc(100% + 0.5rem);
  left: 50%;
  z-index: var(--z-popover, 250);

  min-width: min(18rem, 82vw);
  padding: 0.75rem;

  border: 1px solid var(--border);
  border-radius: var(--panel-radius, 8px);
  background: var(--surface);
  box-shadow: var(--modal-shadow);
  color: var(--foreground);

  opacity: ${({ $open }) => ($open ? 1 : 0)};
  pointer-events: ${({ $open }) => ($open ? "auto" : "none")};
  transform: translateX(-50%)
    ${({ $open }) =>
      $open ? "translateY(0) scale(1)" : "translateY(0.35rem) scale(0.96)"};
  transform-origin: bottom center;
  transition:
    opacity 140ms ease,
    transform 140ms ease,
    visibility 0ms ${({ $open }) => ($open ? "0ms" : "140ms")};
  visibility: ${({ $open }) => ($open ? "visible" : "hidden")};

  :root[data-reduced-motion="true"] & {
    transition: none;
  }
`;
