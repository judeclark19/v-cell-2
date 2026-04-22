"use client";

import * as React from "react";
import {
  ModalActions,
  ModalBody,
  ModalCloseButton,
  ModalHeader,
  ModalHint,
  ModalOverlayRoot,
  ModalPanel,
  ModalTitle
} from "./Modal.styles";

export type ModalProps = {
  actions?: React.ReactNode;
  ariaLabel: string;
  body?: React.ReactNode;
  children?: React.ReactNode;
  closeLabel: string;
  onClose: () => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  overlayProps?: React.HTMLAttributes<HTMLDivElement>;
  panelRef?: React.Ref<HTMLDivElement>;
  title: React.ReactNode;
};

export function Modal({
  actions,
  ariaLabel,
  body,
  children,
  closeLabel,
  onClose,
  onKeyDown,
  overlayProps,
  panelRef,
  title
}: ModalProps) {
  return (
    <ModalOverlayRoot
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      {...overlayProps}
    >
      <ModalPanel
        ref={panelRef}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          <ModalCloseButton
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
          >
            ✕
          </ModalCloseButton>
        </ModalHeader>

        <ModalBody>
          {body == null ? null : typeof body === "string" ? (
            <ModalHint style={{ whiteSpace: "pre-line" }}>{body}</ModalHint>
          ) : (
            body
          )}
          {children}
          {actions == null ? null : <ModalActions>{actions}</ModalActions>}
        </ModalBody>
      </ModalPanel>
    </ModalOverlayRoot>
  );
}
