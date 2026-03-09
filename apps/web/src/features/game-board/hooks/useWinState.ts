import { useCallback, useMemo, useState } from "react";
import { useWinEffects } from "@/features/game-board/effects/winEffects";
import { useSelector } from "react-redux";
import { selectStatus } from "@/state/game/gameSlice";

export type UseWinStateArgs = {
  /** Current deal seed */
  seed: string;

  /** True when all 52 cards are in foundations. */
  isFullyCollected: boolean;

  /** Base modal-open state from other modals (pause/settings/etc). */
  isAnyModalOpenBase: boolean;
};

export type UseWinStateResult = {
  /** Whether the auto-complete panel should be shown. */
  showAcp: boolean;
  /** Manual override to show ACP even when not won. */
  showAcpOverride: boolean;
  setShowAcpOverride: (next: boolean) => void;

  /** Whether the win modal should be shown. */
  shouldShowWinModal: boolean;
  /** Combined "any modal open" (base + win modal). */
  isAnyModalOpen: boolean;

  /** Mark the current seed's win modal as dismissed. */
  dismissWinModal: () => void;

  /** Clear celebration state so confetti can fire again (for new deal/restart/replay). */
  clearCelebration: () => void;

  /** Expose for policies elsewhere. */
  dismissedWinSeed: string | null;
  celebratedWinSeed: string | null;

  clearDismissal: () => void;
};

/**
 * Encapsulates win UX state (win modal + confetti gating + ACP display policy).
 *
 * Separates:
 * - dismissedWinSeed: user closed the modal
 * - celebratedWinSeed: confetti already fired
 */
export function useWinState({
  seed,
  isFullyCollected,
  isAnyModalOpenBase
}: UseWinStateArgs): UseWinStateResult {
  const [dismissedWinSeed, setDismissedWinSeed] = useState<string | null>(null);
  const [celebratedWinSeed, setCelebratedWinSeed] = useState<string | null>(
    null
  );

  // ACP policy: show once won, with an escape hatch override.
  const [showAcpOverride, setShowAcpOverride] = useState(false);

  const status = useSelector(selectStatus);

  const showAcp = useMemo(() => {
    return (status === "won" && !isFullyCollected) || showAcpOverride;
  }, [status, isFullyCollected, showAcpOverride]);

  const shouldShowWinModal = useMemo(() => {
    if (!isFullyCollected) return false;
    return dismissedWinSeed !== seed;
  }, [isFullyCollected, dismissedWinSeed, seed]);

  const dismissWinModal = useCallback(() => {
    setDismissedWinSeed(seed);
  }, [seed]);

  const clearDismissal = useCallback(() => {
    setDismissedWinSeed(null);
  }, []);

  const clearCelebration = useCallback(() => {
    setCelebratedWinSeed(null);
  }, []);

  // Confetti should fire once per won seed, independent of whether the user dismissed the modal.
  useWinEffects({
    shouldShowWinModal,
    winKey: isFullyCollected ? seed : null,
    isDismissed: (key) => celebratedWinSeed === key,
    onCelebrated: (key) => setCelebratedWinSeed(key)
  });

  const isAnyModalOpen = useMemo(() => {
    return isAnyModalOpenBase || shouldShowWinModal;
  }, [isAnyModalOpenBase, shouldShowWinModal]);

  return {
    showAcp,
    showAcpOverride,
    setShowAcpOverride,
    shouldShowWinModal,
    isAnyModalOpen,
    dismissWinModal,
    clearDismissal,
    clearCelebration,
    dismissedWinSeed,
    celebratedWinSeed
  };
}
