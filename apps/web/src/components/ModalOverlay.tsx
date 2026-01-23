import "../styles/modal.css";

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
  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={overlayAriaLabel}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="modal-overlay__panel">
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
