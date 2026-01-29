import { useEffect } from "react";

export type UseWinEffectsArgs = {
  /** Whether the win modal is currently visible */
  shouldShowWinModal: boolean;

  /** Unique key for the current win (e.g. seed or deal id) */
  winKey: string | null;

  /** Return true if this win has already been dismissed/celebrated */
  isDismissed: (winKey: string) => boolean;

  /** Fire the win celebration (Board supplies the actual confetti impl) */
  fireConfetti: () => void;

  /** Mark this win as celebrated so it doesn’t re-fire */
  onCelebrated: (winKey: string) => void;
};

/**
 * Handles win-related side effects (confetti) exactly once per winKey.
 *
 * This hook is intentionally dumb: it owns timing, not visuals.
 */
export function useWinEffects({
  shouldShowWinModal,
  winKey,
  isDismissed,
  fireConfetti,
  onCelebrated
}: UseWinEffectsArgs) {
  useEffect(() => {
    if (!shouldShowWinModal) return;
    if (!winKey) return;
    if (isDismissed(winKey)) return;

    fireConfetti();
    onCelebrated(winKey);
  }, [shouldShowWinModal, winKey, isDismissed, fireConfetti, onCelebrated]);
}
