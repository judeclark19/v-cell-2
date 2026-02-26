import ModalOverlay from "@/components/ModalOverlay";
import { PersistedGame } from "@/persistence/types";
import { useGame } from "@/state/game/GameProvider";
import { useSession } from "@/state/session/SessionProvider";
import { formatElapsed } from "@/ui/utils";
import { useRouter } from "next/navigation";

export type ConfirmRequest = {
  title: string;
  bodyText: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
};

type BoardModalsProps = {
  paused: boolean;
  onResume: () => void;

  shouldShowWinModal: boolean;
  onDismissWinModal: () => void;

  moveCount: number;
  timeElapsedMs: number;

  confirmReq: ConfirmRequest | null;
  dismissConfirm: () => void;
  requestConfirm: (
    req: Omit<ConfirmRequest, "onConfirm">,
    onConfirm: () => void
  ) => void;
  onNewDealAction: () => void;
};

export default function BoardModals({
  paused,
  onResume,
  shouldShowWinModal,
  onDismissWinModal,
  moveCount,
  timeElapsedMs,
  confirmReq,
  dismissConfirm,
  requestConfirm,
  onNewDealAction
}: BoardModalsProps) {
  const router = useRouter();
  const game = useGame();
  const { isUser } = useSession();

  function deriveWinRateLastN(games: PersistedGame[], n = 100) {
    const ended = games
      .filter((g) => typeof g.endedAtMs === "number" && g.endedAtMs)
      .slice()
      .sort((a, b) => (b.endedAtMs ?? 0) - (a.endedAtMs ?? 0));

    const lastN = ended.slice(0, n);
    const wins = lastN.filter((g) => g.status === "won").length;
    const count = lastN.length;
    const winRate = count === 0 ? 0 : Math.round((wins / count) * 100);

    return { count, wins, winRate };
  }

  const getWinBodyText = () => {
    // calculate if the current game is the best time / best moves based on completed history
    const fastest = [...game.completedGames]
      .filter((g) => g.status === "won" && Number.isFinite(g.timeElapsedMs))
      .sort(
        (a, b) => (a.timeElapsedMs as number) - (b.timeElapsedMs as number)
      )[0];

    const fewestMoves = [...game.completedGames]
      .filter((g) => g.status === "won" && Number.isFinite(g.moveCount))
      .sort((a, b) => (a.moveCount as number) - (b.moveCount as number))[0];

    const isNewBestTime = fastest?.gameId === game.gameId;
    const isNewBestMoves = fewestMoves?.gameId === game.gameId;

    let bodyText = `Moves: ${moveCount} • Time: ${formatElapsed(timeElapsedMs)}`;

    if (!isUser) return bodyText; // only show win rate and records to signed-in users since it's based on persisted history

    bodyText += `\nYou have won ${deriveWinRateLastN(game.completedGames).wins} out of your last ${deriveWinRateLastN(game.completedGames).count} games (${deriveWinRateLastN(game.completedGames).winRate}% win rate)`;

    if (isNewBestTime) {
      bodyText += "\n🎉 New record for fastest game!";
    }

    if (isNewBestMoves) {
      bodyText += "\n🎉 New record for fewest moves!";
    }

    return bodyText;
  };

  return (
    <>
      {confirmReq && (
        <ModalOverlay
          overlayAriaLabel="Confirm action"
          title={confirmReq.title}
          buttonAriaLabel="Close confirmation dialog"
          onClose={dismissConfirm}
          bodyText={confirmReq.bodyText}
          primaryButtonLabel={confirmReq.confirmLabel ?? "Confirm"}
          primaryButtonAction={() => {
            const fn = confirmReq.onConfirm;
            dismissConfirm();
            fn();
          }}
          secondaryButtonLabel={confirmReq.cancelLabel ?? "Cancel"}
          secondaryButtonAction={dismissConfirm}
        />
      )}

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
          bodyText={getWinBodyText()}
          primaryButtonLabel="New Deal"
          primaryButtonAction={() =>
            requestConfirm(
              {
                title: "Start a new deal?",
                bodyText:
                  "Starting a new deal will abandon your current progress.",
                confirmLabel: "New deal",
                cancelLabel: "Cancel"
              },
              onNewDealAction
            )
          }
          secondaryButtonLabel={isUser ? "View all stats" : "Close"}
          secondaryButtonAction={() => {
            onDismissWinModal();
            if (isUser) {
              router.push("/stats");
            }
          }}
        />
      )}
    </>
  );
}
