import { useEffect } from "react";
import { throwConfetti } from "@/features/game-board/effects/winConfetti";

export type UseWinEffectsArgs = {
  /** Whether the win modal is currently visible */
  shouldShowWinModal: boolean;

  /** Unique key for the current win (e.g. seed or deal id) */
  winKey: string | null;

  /** Return true if this win has already been dismissed/celebrated */
  isDismissed: (winKey: string) => boolean;

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
  onCelebrated
}: UseWinEffectsArgs) {
  useEffect(() => {
    if (!shouldShowWinModal) return;
    if (!winKey) return;
    if (isDismissed(winKey)) return;

    throwConfetti();
    onCelebrated(winKey);
  }, [shouldShowWinModal, winKey, isDismissed, onCelebrated]);
}
