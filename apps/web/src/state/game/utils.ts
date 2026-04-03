import JSConfetti from "js-confetti";
import {
  applyMove,
  areAllCardsUnlocked,
  type GameState,
  type Move,
  type Rules
} from "@vcell/engine";

export function areRulesEqual(a: Rules, b: Rules): boolean {
  return (
    a.allowFoundationPullback === b.allowFoundationPullback &&
    a.undoLimit === b.undoLimit &&
    a.faceDownCount === b.faceDownCount
  );
}

export function computePostMoveResult({
  moveToApply,
  currentCursor,
  currentMoves,
  currentStatus,
  currentPresent
}: {
  moveToApply: Move;
  currentCursor: number;
  currentMoves: Move[];
  currentStatus: "in_progress" | "won" | "abandoned" | null;
  currentPresent: GameState;
}) {
  const truncated = currentMoves.slice(0, currentCursor);
  const nextMoves = [...truncated, moveToApply];
  const nextCursor = currentCursor + 1;

  const next = applyMove(currentPresent, moveToApply);
  const didWin = currentStatus !== "won" && areAllCardsUnlocked(next);
  const shouldCheckpoint = nextCursor > 0 && nextCursor % 20 === 0;

  return {
    next,
    nextMoves,
    nextCursor,
    didWin,
    shouldCheckpoint
  };
}

export function throwConfetti() {
  const confetti = new JSConfetti();

  const cardEl = document.querySelector<HTMLElement>(".card");
  const cardWidth = cardEl?.getBoundingClientRect().width;

  // Derive emoji size from card width (fallback to 24)
  const rawEmojiSize = cardWidth ? cardWidth * 0.3 : 24;

  // Clamp to a sensible range
  const emojiSize = Math.max(16, Math.min(40, Math.round(rawEmojiSize)));

  // custom confetti
  confetti.addConfetti({
    emojis: ["🎰", "🃏", "❤️", "♠️", "♣️", "♦️"],
    emojiSize,
    confettiNumber: 200
  });

  // plus standard confetti
  confetti.addConfetti({
    confettiNumber: 200
  });
}
