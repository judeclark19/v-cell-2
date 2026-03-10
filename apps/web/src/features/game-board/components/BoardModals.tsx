import ModalOverlay from "@/components/ModalOverlay";
import { PersistedGame } from "@/persistence/types";
import { useGame } from "@/state/game/GameProvider";
import { selectCompletedGames } from "@/state/records/recordsSlice";
import { useSession } from "@/state/session/SessionProvider";
import {
  selectPaused,
  selectTimeElapsedMs,
  setPaused
} from "@/state/session/sessionSlice";
import { formatElapsed } from "@/ui/utils";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { useBoardController } from "../hooks/useBoardController";
import { selectMoveCount } from "@/state/game/gameSlice";
import { selectConfirmReq } from "@/state/ui/uiSlice";
import { dismissConfirmation } from "@/state/ui/requestConfirmation";
import { AppDispatch } from "@/state/reduxStore";

export type ConfirmRequest = {
  title: string;
  bodyText: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
};

export default function BoardModals() {
  const router = useRouter();
  const game = useGame();
  const { isUser } = useSession();
  const { shouldShowWinModal, dismissWinModal, newDealWithCelebration } =
    useBoardController(game);

  const dispatch = useDispatch<AppDispatch>();
  // Session state
  const paused = useSelector(selectPaused);
  const timeElapsedMs = useSelector(selectTimeElapsedMs);
  const confirmReq = useSelector(selectConfirmReq);
  // Game state
  const moveCount = useSelector(selectMoveCount);
  // Records state
  const completedGames = useSelector(selectCompletedGames);

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
    const fastest = completedGames
      .filter((g) => g.status === "won" && Number.isFinite(g.timeElapsedMs))
      .sort(
        (a, b) => (a.timeElapsedMs as number) - (b.timeElapsedMs as number)
      )[0];

    const fewestMoves = completedGames
      .filter((g) => g.status === "won" && Number.isFinite(g.moveCount))
      .sort((a, b) => (a.moveCount as number) - (b.moveCount as number))[0];

    const isNewBestTime = fastest?.sessionId === game.sessionId;
    const isNewBestMoves = fewestMoves?.sessionId === game.sessionId;

    let bodyText = `Moves: ${moveCount} • Time: ${formatElapsed(timeElapsedMs)}`;

    if (!isUser) return bodyText; // only show win rate and records to signed-in users since it's based on persisted history

    bodyText += `\nYou have won ${deriveWinRateLastN(completedGames).wins} out of your last ${deriveWinRateLastN(completedGames).count} games (${deriveWinRateLastN(completedGames).winRate}% win rate)`;

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
          onClose={() => dismissConfirmation(dispatch, confirmReq)}
          bodyText={confirmReq.bodyText}
          primaryButtonLabel={confirmReq.confirmLabel ?? "Confirm"}
          primaryButtonAction={confirmReq.onConfirm}
          secondaryButtonLabel={confirmReq.cancelLabel ?? "Cancel"}
          secondaryButtonAction={() =>
            dismissConfirmation(dispatch, confirmReq)
          }
        />
      )}

      {paused && (
        <ModalOverlay
          overlayAriaLabel="Game paused"
          title="Paused"
          buttonAriaLabel="Resume game"
          onClose={() => dispatch(setPaused(false))}
          bodyText="Timer is paused. Gameplay is disabled until you resume."
          primaryButtonLabel="Resume"
        />
      )}

      {shouldShowWinModal && (
        <ModalOverlay
          overlayAriaLabel="Game won"
          title="You won!"
          buttonAriaLabel="Close win dialog"
          onClose={dismissWinModal}
          bodyText={getWinBodyText()}
          primaryButtonLabel="New Deal"
          primaryButtonAction={newDealWithCelebration}
          secondaryButtonLabel={isUser ? "View all stats" : "Close"}
          secondaryButtonAction={() => {
            dismissWinModal();
            if (isUser) {
              router.push("/stats");
            }
          }}
        />
      )}
    </>
  );
}
