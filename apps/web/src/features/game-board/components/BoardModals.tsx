import ModalOverlay from "@/components/ModalOverlay";
import { formatElapsed } from "@/ui/utils";

type BoardModalsProps = {
  paused: boolean;
  onResume: () => void;

  shouldShowWinModal: boolean;
  onDismissWinModal: () => void;

  moveCount: number;
  timeElapsedMs: number;

  onNewDeal: () => void;
};

export default function BoardModals({
  paused,
  onResume,
  shouldShowWinModal,
  onDismissWinModal,
  moveCount,
  timeElapsedMs,
  onNewDeal
}: BoardModalsProps) {
  return (
    <>
      {paused && (
        <ModalOverlay
          overlayAriaLabel="Game paused"
          title="Paused"
          buttonAriaLabel="Resume game"
          onClose={onResume}
          bodyText="Timer is paused. Gameplay is disabled until you resume."
          primaryButtonLabel="Resume"
        />
      )}

      {shouldShowWinModal && (
        <ModalOverlay
          overlayAriaLabel="Game won"
          title="You won!"
          buttonAriaLabel="Close win dialog"
          onClose={onDismissWinModal}
          bodyText={`Moves: ${moveCount} • Time: ${formatElapsed(timeElapsedMs)}`}
          primaryButtonLabel="New Deal"
          primaryButtonAction={onNewDeal}
          secondaryButtonLabel="Close"
        />
      )}
    </>
  );
}
