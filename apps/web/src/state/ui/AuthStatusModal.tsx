"use client";

import ModalOverlay from "@/components/ModalOverlay";
import {
  closeAuthStatusModal,
  selectAuthStatusModal
} from "@/state/ui/uiSlice";
import { useDispatch, useSelector } from "react-redux";

export function AuthStatusModal() {
  const dispatch = useDispatch();
  const authStatusModal = useSelector(selectAuthStatusModal);

  if (!authStatusModal) return null;

  return (
    <ModalOverlay
      overlayAriaLabel={authStatusModal.title}
      title={authStatusModal.title}
      buttonAriaLabel="Close status dialog"
      onClose={() => dispatch(closeAuthStatusModal())}
      bodyText={authStatusModal.bodyText}
      primaryButtonLabel="OK"
    />
  );
}
