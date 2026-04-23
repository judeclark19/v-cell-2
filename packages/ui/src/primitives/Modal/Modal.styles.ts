"use client";

import styled from "styled-components";

export const ModalOverlayRoot = styled.div`
  position: fixed;
  inset: 0;
  z-index: var(--z-modal, 300);

  display: grid;
  place-items: center;
  overflow: auto;
  padding: var(--modal-viewport-padding, 24px);

  background: var(--modal-overlay-bg);
  backdrop-filter: blur(2px);

  :root[data-reduced-motion="true"] & {
    backdrop-filter: none;
  }
`;

export const ModalPanel = styled.div`
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  max-height: calc(100dvh - (var(--modal-viewport-padding, 24px) * 2));
  padding: 16px;
  width: min(420px, 92vw);

  border-radius: var(--modal-radius);
  background: var(--modal-bg);
  border: 1px solid var(--modal-border);
  box-shadow: var(--modal-shadow);
`;

export const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
`;

export const ModalTitle = styled.div`
  font-size: 18px;
  font-weight: 700;
`;

export const ModalCloseButton = styled.button`
  appearance: none;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 8px;

  &:hover {
    background: color-mix(in srgb, var(--muted) 20%, transparent);
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
  }
`;

export const ModalBody = styled.div`
  display: grid;
  gap: 12px;
  min-height: 0;
  overflow: auto;
`;

export const ModalHint = styled.p`
  margin: 0;
  color: var(--muted);
`;

export const ModalActions = styled.div`
  position: sticky;
  bottom: 0;

  display: flex;
  gap: 8px;
  padding-top: 12px;

  & > * {
    flex: 1;
  }
`;
