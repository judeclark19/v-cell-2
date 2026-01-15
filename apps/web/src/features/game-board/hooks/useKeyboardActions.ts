import { useCallback, useRef } from "react";

import { commitBoardDrop } from "@/features/game-board/hooks/useBoardDrop";
import { getCardIdFromEl } from "@/features/game-board/dom/boardDomMapping";
import { findFocusableCardElById } from "@/features/game-board/keyboard/keyboardFocusUtils";
/**
 * The goal of this hook is to own *actions* (effects on the game),
 * independent of keyboard navigation routing and independent of DOM class mutations.
 */

// ---- Small runtime helpers (typed without `any`) ----

type UnknownRecord = Record<string, unknown>;

function isRecord(v: unknown): v is UnknownRecord {
  return typeof v === "object" && v !== null;
}

function getStr(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function getRecord(v: unknown): UnknownRecord | null {
  return isRecord(v) ? v : null;
}

function getMoveCardId(move: unknown): string | null {
  if (!isRecord(move)) return null;
  // We’ve used { cardId } in several places.
  const direct = getStr(move.cardId);
  if (direct) return direct;

  // Some move shapes use { card: { id } }
  const card = getRecord(move.card);
  const nested = card ? getStr(card.id) : null;
  return nested;
}

function getMoveTo(move: unknown): UnknownRecord | null {
  if (!isRecord(move)) return null;
  const to = getRecord(move.to);
  return to;
}

function isMoveToPileType(
  move: unknown,
  pileType: "foundation" | "freecell"
): boolean {
  const to = getMoveTo(move);
  if (!to) return false;
  return getStr(to.type) === pileType;
}

function getDragSourceType(drag: unknown): string | null {
  if (!isRecord(drag)) return null;
  const source = getRecord(drag.source);
  return source ? getStr(source.type) : null;
}

function getDropTargetType(dropTarget: unknown): string | null {
  if (!isRecord(dropTarget)) return null;
  return getStr(dropTarget.type);
}

// ---- Types derived from commitBoardDrop so we stay aligned with the real signature ----

type CommitArgs = Parameters<typeof commitBoardDrop>[0];

export type UseKeyboardActionsArgs = {
  legalMoves: CommitArgs["legalMoves"];
  dispatchMove: CommitArgs["dispatchMove"];

  canUndo: boolean;
  undo: () => void;

  newDeal: () => void;
  restart: () => void;

  paused: boolean;
  setPaused: (next: boolean) => void;

  /** UI helpers (already exist elsewhere; we call them as a first-class behavior) */
  tryAutoFoundationFromEl: (el: HTMLElement) => boolean;
  tryAutoFreeCellFromEl: (el: HTMLElement) => boolean;

  /** DOM → drag/drop for keyboard */
  buildKbDragFromEl: (el: HTMLElement) => CommitArgs["drag"] | null;
  buildKbDropTargetFromEl: (el: HTMLElement) => CommitArgs["dropTarget"] | null;

  /** Board root for post-undo focus restore */
  boardRef: React.RefObject<HTMLElement | null>;

  /** Read the current keyboard-carry DOM nodes from the visuals hook */
  getCarriedEl: () => HTMLElement | null;
  getDropTargetEl: () => HTMLElement | null;
};

export function useKeyboardActions(args: UseKeyboardActionsArgs) {
  const {
    legalMoves,
    dispatchMove,
    canUndo,
    undo,
    tryAutoFoundationFromEl,
    tryAutoFreeCellFromEl,
    buildKbDragFromEl,
    buildKbDropTargetFromEl,
    boardRef,
    getCarriedEl,
    getDropTargetEl
  } = args;

  /**
   * Used to restore focus after keyboard-driven actions.
   *
   * Convention:
   * - whenever we *commit* a keyboard move, we store the moved card id
   * - undo tries to restore focus to that id
   */
  const lastKbMovedCardIdRef = useRef<string | null>(null);

  const tryCommitKeyboardDrop = useCallback(
    (
      carriedEl?: HTMLElement | null,
      targetEl?: HTMLElement | null
    ): boolean => {
      const carried = carriedEl ?? getCarriedEl();
      const target = targetEl ?? getDropTargetEl();

      if (!carried || !target) return false;

      // Build drag + drop from DOM (forward interpretation: carried -> target)
      const drag = buildKbDragFromEl(carried);
      const dropTarget = buildKbDropTargetFromEl(target);

      if (!drag || !dropTarget) return false;

      // Remember which card was moved (best effort)
      const movedId = getCardIdFromEl(carried);
      if (movedId) lastKbMovedCardIdRef.current = movedId;

      // Delegate the actual rule-checking + dispatch to the same logic as mouse drops
      const didForward = commitBoardDrop({
        legalMoves,
        dispatchMove,
        drag,
        dropTarget
      } as CommitArgs);

      if (didForward) return true;

      // Keyboard leniency: if this was tableau -> tableau and forward failed,
      // try the reversed interpretation (target -> carried).
      const dragSourceType = getDragSourceType(drag);
      const dropType = getDropTargetType(dropTarget);

      if (dragSourceType !== "tableau" || dropType !== "tableau") return false;

      const reverseDrag = buildKbDragFromEl(target);
      const reverseDropTarget = buildKbDropTargetFromEl(carried);

      if (!reverseDrag || !reverseDropTarget) return false;

      const reverseDragSourceType = getDragSourceType(reverseDrag);
      const reverseDropType = getDropTargetType(reverseDropTarget);

      if (reverseDragSourceType !== "tableau" || reverseDropType !== "tableau")
        return false;

      const reverseMovedId = getCardIdFromEl(target);
      if (reverseMovedId) lastKbMovedCardIdRef.current = reverseMovedId;

      return commitBoardDrop({
        legalMoves,
        dispatchMove,
        drag: reverseDrag,
        dropTarget: reverseDropTarget
      } as CommitArgs);
    },
    [
      buildKbDragFromEl,
      buildKbDropTargetFromEl,
      dispatchMove,
      getCarriedEl,
      getDropTargetEl,
      legalMoves
    ]
  );

  /**
   * Deterministic “send to foundation”.
   *
   * Strategy:
   * 1) If there is a legal move for this card to a foundation, dispatch the first match.
   * 2) Otherwise, fall back to the existing DOM helper (which may do its own lookup).
   */
  const handleAutoFoundation = useCallback(
    (el: HTMLElement): boolean => {
      const cardId = getCardIdFromEl(el);

      if (cardId) {
        const moves = legalMoves;
        const match = moves.find(
          (m) =>
            getMoveCardId(m) === cardId && isMoveToPileType(m, "foundation")
        );
        if (match) {
          lastKbMovedCardIdRef.current = cardId;
          dispatchMove(match);
          return true;
        }
      }

      const did = tryAutoFoundationFromEl(el);
      if (did) {
        const movedId = cardId ?? getCardIdFromEl(el);
        if (movedId) lastKbMovedCardIdRef.current = movedId;
      }
      return did;
    },
    [dispatchMove, legalMoves, tryAutoFoundationFromEl]
  );

  /**
   * Deterministic “send to free cell”.
   *
   * Strategy mirrors foundation.
   */
  const handleAutoFreeCell = useCallback(
    (el: HTMLElement): boolean => {
      const cardId = getCardIdFromEl(el);

      if (cardId) {
        const moves = legalMoves;
        const match = moves.find(
          (m) => getMoveCardId(m) === cardId && isMoveToPileType(m, "freecell")
        );
        if (match) {
          lastKbMovedCardIdRef.current = cardId;
          dispatchMove(match);
          return true;
        }
      }

      const did = tryAutoFreeCellFromEl(el);
      if (did) {
        const movedId = cardId ?? getCardIdFromEl(el);
        if (movedId) lastKbMovedCardIdRef.current = movedId;
      }
      return did;
    },
    [dispatchMove, legalMoves, tryAutoFreeCellFromEl]
  );

  /**
   * Undo + focus restoration.
   *
   * We restore focus *after* React has committed the new state. Using rAF is the
   * simplest reliable way here.
   */
  const handleUndo = useCallback(
    (anchorEl?: HTMLElement | null): boolean => {
      if (!canUndo) return false;

      const root = boardRef.current;
      if (!root) {
        undo();
        return true;
      }

      // Prefer restoring focus to the card we last moved via keyboard.
      // Otherwise fall back to the currently focused/anchor element’s card id.
      const anchorId =
        lastKbMovedCardIdRef.current ??
        (anchorEl ? getCardIdFromEl(anchorEl) : null) ??
        getCardIdFromEl(document.activeElement as HTMLElement);

      undo();

      // After state updates, restore focus.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!anchorId) return;

          const focusEl = findFocusableCardElById(root, anchorId);
          if (focusEl) focusEl.focus();
        });
      });

      return true;
    },
    [boardRef, canUndo, undo]
  );

  const handleNewDeal = useCallback((): void => {
    lastKbMovedCardIdRef.current = null;
    args.newDeal();
  }, [args]);

  const handleRestart = useCallback((): void => {
    lastKbMovedCardIdRef.current = null;
    args.restart();
  }, [args]);

  const handlePauseToggle = useCallback((): void => {
    args.setPaused(!args.paused);
  }, [args]);

  return {
    lastKbMovedCardIdRef,
    tryCommitKeyboardDrop,
    handleAutoFoundation,
    handleAutoFreeCell,
    handleUndo,
    handleNewDeal,
    handleRestart,
    handlePauseToggle
  };
}
