import { useDispatch } from "react-redux";
import "../styles/modal.css";
import { useEffect, useRef } from "react";
import { setIsAnyModalOpen } from "@/state/ui/uiSlice";

type ModalOverlayProps = {
  overlayAriaLabel: string;
  title: string;
  buttonAriaLabel: string;
  onClose: () => void;
  bodyText: string;
  primaryButtonLabel: string;
  primaryButtonAction?: () => void;
  secondaryButtonLabel?: string;
  secondaryButtonAction?: () => void;
  onOverlayKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
};

export default function ModalOverlay({
  overlayAriaLabel,
  title,
  buttonAriaLabel,
  onClose,
  bodyText,
  primaryButtonLabel,
  primaryButtonAction = onClose,
  secondaryButtonLabel,
  secondaryButtonAction = onClose,
  onOverlayKeyDown
}: ModalOverlayProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const primaryButtonRef = useRef<HTMLButtonElement | null>(null);
  const prevFocusedElRef = useRef<HTMLElement | null>(null);

  const dispatch = useDispatch();

  useEffect(() => {
    prevFocusedElRef.current = document.activeElement as HTMLElement | null;

    // Lock background scroll while modal is open.
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    // Focus the primary CTA (best default). Fall back to the panel.
    const focusTarget = primaryButtonRef.current ?? panelRef.current;
    focusTarget?.focus();

    return () => {
      // Restore background scroll.
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      // Restore focus to whatever had it before the modal opened.
      prevFocusedElRef.current?.focus?.();
    };
  }, []);

  const closeModal = () => {
    dispatch(setIsAnyModalOpen(false));
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onOverlayKeyDown?.(e);
    if (e.defaultPrevented) return;

    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
      return;
    }

    if (e.key !== "Tab") return;

    const panel = panelRef.current;
    if (!panel) return;

    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);

    if (focusables.length === 0) {
      e.preventDefault();
      panel.focus();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (e.shiftKey) {
      if (active === first || !panel.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={overlayAriaLabel}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <div className="modal-overlay__panel" ref={panelRef} tabIndex={-1}>
        <div className="modal-overlay__header">
          <div className="modal-overlay__title">{title}</div>
          <button
            type="button"
            className="modal-overlay__close"
            aria-label={buttonAriaLabel}
            onClick={closeModal}
          >
            ✕
          </button>
        </div>

        <div className="modal-overlay__body">
          <p className="modal-overlay__hint" style={{ whiteSpace: "pre-line" }}>
            {bodyText}
          </p>

          <div className="modal-overlay__buttons">
            {secondaryButtonLabel && (
              <button
                type="button"
                className="btn btn--secondary"
                onClick={secondaryButtonAction}
              >
                {secondaryButtonLabel}
              </button>
            )}

            <button
              ref={primaryButtonRef}
              type="button"
              className="btn btn--primary"
              onClick={primaryButtonAction}
            >
              {primaryButtonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
