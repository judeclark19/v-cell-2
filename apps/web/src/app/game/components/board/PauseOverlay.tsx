import React from "react";

type PauseOverlayProps = {
  onClose: () => void;
};

export default function PauseOverlay({ onClose }: PauseOverlayProps) {
  return (
    <div
      className="pause-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Game paused"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="pause-overlay__panel">
        <div className="pause-overlay__header">
          <div className="pause-overlay__title">Paused</div>
          <button
            type="button"
            className="pause-overlay__close"
            aria-label="Resume game"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="pause-overlay__body">
          <p className="pause-overlay__hint">
            Timer is paused. Gameplay is disabled until you resume.
          </p>
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Resume
          </button>
        </div>
      </div>
    </div>
  );
}
