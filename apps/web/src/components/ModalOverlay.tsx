import "../styles/modal.css";
import { useEffect, useRef } from "react";

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
  secondaryButtonAction = onClose
}: ModalOverlayProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const primaryButtonRef = useRef<HTMLButtonElement | null>(null);
  const prevFocusedElRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    prevFocusedElRef.current = document.activeElement as HTMLElement | null;

    // Focus the primary CTA (best default). Fall back to the panel.
    const focusTarget = primaryButtonRef.current ?? panelRef.current;
    focusTarget?.focus();

    return () => {
      // Restore focus to whatever had it before the modal opened.
      prevFocusedElRef.current?.focus?.();
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
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
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="modal-overlay__body">
          <p className="modal-overlay__hint">{bodyText}</p>

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
