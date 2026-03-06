import { useCallback, useRef } from "react";

import { commitBoardDrop } from "@/features/game-board/hooks/useBoardDrop";
import { getCardIdFromEl } from "@/features/game-board/dom/domMappingCore";
import { findFocusableCardElById } from "@/features/game-board/keyboard/keyboardFocusUtils";

import type { Card as EngineCard } from "@vcell/engine";
import type {
  DragSource,
  DropTarget
} from "@/features/game-board/animations/dragTypes";
import { selectCanUndo } from "@/state/game";
import { useDispatch, useSelector } from "react-redux";
import { selectPaused, setPaused } from "@/state/session/sessionSlice";
/**
 * The goal of this hook is to own *actions* (effects on the game),
 * independent of keyboard navigation routing and independent of DOM class mutations.
 */

// ---- Small runtime helpers (typed without `any`) ----

type KbDragLike = {
  source: DragSource | null;
  stack: Array<{ card: EngineCard; faceDown: boolean }>;
};

const isSingleMove = (m: Move): m is SingleMove => m.kind === "single";

const moveFromMatchesDragSource = (
  m: SingleMove,
  source: DragSource
): boolean => {
  if (m.from.type !== source.type) return false;

  switch (source.type) {
    case "foundation":
    case "freecell":
      return m.from.index === source.index;

    case "tableau":
      // engine uses `from.index` for tableau column index
      return m.from.index === source.colIndex;

    default:
      return false;
  }
};

const getMoveToIndex = (m: SingleMove): number | null => {
  if (m.to.type === "foundation" || m.to.type === "freecell") return m.to.index;
  return null;
};

function findTableauTailAnchorEl(
  root: HTMLElement | null,
  colIndex: number
): HTMLElement | null {
  if (!root) return null;
  return (
    root.querySelector<HTMLElement>(
      `[data-tableau-tail-anchor='true'][data-tableau-col='${colIndex}']`
    ) ?? null
  );
}

function findTableauTailCardEl(
  root: HTMLElement | null,
  colIndex: number
): HTMLElement | null {
  if (!root) return null;

  const anchor = findTableauTailAnchorEl(root, colIndex);
  if (!anchor) return null;

  // In your DOM, the tail anchor may be the card itself OR a wrapper.
  // Prefer a descendant card element if present, otherwise fall back to the anchor.
  return (
    anchor.querySelector<HTMLElement>("[data-card-id]") ??
    anchor.closest<HTMLElement>("[data-card-id]") ??
    anchor
  );
}

const isMoveToPileType = (m: SingleMove, pileType: PileType): boolean =>
  m.to.type === pileType;

// ---- Types derived from commitBoardDrop so we stay aligned with the real signature ----

type CommitArgs = Parameters<typeof commitBoardDrop>[0];
type Move = CommitArgs["legalMoves"][number];
type SingleMove = Extract<Move, { kind: "single" }>;
type PileType = "foundation" | "freecell";

export type UseKeyboardActionsArgs = {
  legalMoves: CommitArgs["legalMoves"];
  dispatchMove: CommitArgs["dispatchMove"];

  undo: () => void;

  newDeal: () => void;
  restart: () => void;

  /** UI helpers (already exist elsewhere; we call them as a first-class behavior) */
  tryAutoFoundationFromEl: (el: HTMLElement) => boolean;
  tryAutoFreeCellFromEl: (el: HTMLElement) => boolean;

  /** DOM → drag/drop for keyboard */
  buildKbDragFromEl: (el: HTMLElement) => KbDragLike | null;
  buildKbDropTargetFromEl: (el: HTMLElement) => DropTarget | null;

  /** Start a visual-only keyboard "flight" animation for a committed keyboard move. */
  startKbFlight: (args: {
    fromEl: HTMLElement;
    toEl: HTMLElement;
    kbDrag: KbDragLike;
    dropTarget: NonNullable<DropTarget>;
  }) => void;

  /** Board root for post-undo focus restore */
  boardRef: React.RefObject<HTMLElement | null>;

  /** Read the current keyboard-carry DOM nodes from the visuals hook */
  getCarriedEl: () => HTMLElement | null;
  getDropTargetEl: () => HTMLElement | null;

  /** Resolve destination elements without DOM querying */
  getFoundationDropEl: (index: number) => HTMLElement | null;
  getFreeCellDropEl: (index: number) => HTMLElement | null;
};

export function useKeyboardActions(args: UseKeyboardActionsArgs) {
  const {
    legalMoves,
    dispatchMove,
    undo,
    tryAutoFoundationFromEl,
    tryAutoFreeCellFromEl,
    buildKbDragFromEl,
    buildKbDropTargetFromEl,
    startKbFlight,
    boardRef,
    getCarriedEl,
    getDropTargetEl,
    getFoundationDropEl,
    getFreeCellDropEl
  } = args;

  /**
   * Used to restore focus after keyboard-driven actions.
   *
   * Convention:
   * - whenever we *commit* a keyboard move, we store the moved card id
   * - undo tries to restore focus to that id
   */
  const lastKbMovedCardIdRef = useRef<string | null>(null);

  /**
   * Used by `useBoardKeyboardSystem` to restore focus after kb drop.
   * We capture the drag source (especially tableau col/startIndex) at commit time.
   */
  const pendingKbDropFocusSourceRef = useRef<DragSource | null>(null);

  const canCommitKeyboardDropForward = useCallback(
    (carriedEl: HTMLElement | null, targetEl: HTMLElement | null): boolean => {
      if (!carriedEl || !targetEl) return false;

      const drag = buildKbDragFromEl(carriedEl);
      const dropTarget = buildKbDropTargetFromEl(targetEl);

      if (!drag || !dropTarget) return false;

      // Use the same legality logic as mouse drops, but with a no-op dispatcher
      // so this check has no gameplay side effects.
      const noopDispatch: CommitArgs["dispatchMove"] = (() => {
        /* no-op */
      }) as CommitArgs["dispatchMove"];

      return commitBoardDrop({
        legalMoves,
        dispatchMove: noopDispatch,
        drag,
        dropTarget
      } as CommitArgs);
    },
    [buildKbDragFromEl, buildKbDropTargetFromEl, legalMoves]
  );

  const isLegalKeyboardDropTargetEl = useCallback(
    (el: HTMLElement): boolean => {
      const carried = getCarriedEl();
      return canCommitKeyboardDropForward(carried, el);
    },
    [canCommitKeyboardDropForward, getCarriedEl]
  );

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

      // Delegate legality to the same logic as mouse drops.
      // Guard with a no-op pass first so we can reuse this predicate elsewhere.
      const isForwardLegal = canCommitKeyboardDropForward(carried, target);
      if (!isForwardLegal) return false;

      const forwardMovedId = getCardIdFromEl(carried);
      if (forwardMovedId) lastKbMovedCardIdRef.current = forwardMovedId;
      pendingKbDropFocusSourceRef.current = drag.source;

      const flightToEl =
        dropTarget.type === "tableau"
          ? (findTableauTailAnchorEl(boardRef.current, dropTarget.colIndex) ??
            target)
          : target;

      startKbFlight({
        fromEl: carried,
        toEl: flightToEl,
        kbDrag: drag,
        dropTarget
      });

      const didForward = commitBoardDrop({
        legalMoves,
        dispatchMove,
        drag,
        dropTarget
      } as CommitArgs);

      if (didForward) return true;

      // Keyboard leniency: if this was tableau -> tableau and forward failed,
      // try the reversed interpretation (target -> carried).
      if (drag.source?.type !== "tableau" || dropTarget.type !== "tableau")
        return false;

      const reverseDrag = buildKbDragFromEl(target);
      const reverseDropTarget = buildKbDropTargetFromEl(carried);

      if (!reverseDrag || !reverseDropTarget) return false;
      if (
        reverseDrag.source?.type !== "tableau" ||
        reverseDropTarget.type !== "tableau"
      ) {
        return false;
      }

      const reverseMovedId = getCardIdFromEl(target);
      if (reverseMovedId) lastKbMovedCardIdRef.current = reverseMovedId;
      pendingKbDropFocusSourceRef.current = reverseDrag.source;

      const reverseFlightToEl =
        reverseDropTarget.type === "tableau"
          ? (findTableauTailAnchorEl(
              boardRef.current,
              reverseDropTarget.colIndex
            ) ?? carried)
          : carried;

      startKbFlight({
        fromEl: target,
        toEl: reverseFlightToEl,
        kbDrag: reverseDrag,
        dropTarget: reverseDropTarget
      });

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
      legalMoves,
      canCommitKeyboardDropForward,
      startKbFlight,
      boardRef
    ]
  );

  /**
   * Deterministic “send to foundation or free cell”.
   *
   * Strategy:
   * 1) If there is a legal move for this card to a foundation/free cell, dispatch the first match.
   * 2) Otherwise, fall back to the existing DOM helper (which may do its own lookup).
   */

  function autoToPile(
    el: HTMLElement,
    opts: {
      pileType: PileType;
      getDropEl: (index: number) => HTMLElement | null;
      tryAutoFromEl: (el: HTMLElement) => boolean;
      legalMoves: CommitArgs["legalMoves"];
      dispatchMove: CommitArgs["dispatchMove"];
      boardRef: React.RefObject<HTMLElement | null>;
      buildKbDragFromEl: (el: HTMLElement) => KbDragLike | null;
      startKbFlight: UseKeyboardActionsArgs["startKbFlight"];
      lastKbMovedCardIdRef: React.RefObject<string | null>;
    }
  ): boolean {
    const {
      pileType,
      getDropEl,
      tryAutoFromEl,
      legalMoves,
      dispatchMove,
      boardRef,
      buildKbDragFromEl,
      startKbFlight,
      lastKbMovedCardIdRef
    } = opts;

    const cardId = getCardIdFromEl(el);

    if (cardId) {
      const kbDrag = buildKbDragFromEl(el);
      const source = kbDrag?.source;

      const match: SingleMove | undefined = source
        ? legalMoves.find(
            (m): m is SingleMove =>
              isSingleMove(m) &&
              isMoveToPileType(m, pileType) &&
              moveFromMatchesDragSource(m, source)
          )
        : undefined;

      if (match) {
        const root = boardRef.current;

        const fromElForFlight =
          source?.type === "tableau"
            ? (findTableauTailCardEl(root, source.colIndex) ?? el)
            : el;

        const movedIdForFlight = getCardIdFromEl(fromElForFlight);
        lastKbMovedCardIdRef.current = movedIdForFlight ?? cardId;

        const kbDragForFlight = buildKbDragFromEl(fromElForFlight);
        const toIndex = getMoveToIndex(match);

        if (toIndex != null && kbDragForFlight) {
          const toEl = getDropEl(toIndex);

          if (toEl) {
            startKbFlight({
              fromEl: fromElForFlight,
              toEl,
              kbDrag: kbDragForFlight,
              dropTarget: { type: pileType, index: toIndex }
            });
          }
        }

        dispatchMove(match);
        return true;
      }
    }

    const did = tryAutoFromEl(el);
    if (did) {
      const movedId = cardId ?? getCardIdFromEl(el);
      if (movedId) lastKbMovedCardIdRef.current = movedId;
    }

    return did;
  }

  const handleAutoFoundation = useCallback(
    (el: HTMLElement) =>
      autoToPile(el, {
        pileType: "foundation",
        getDropEl: getFoundationDropEl,
        tryAutoFromEl: tryAutoFoundationFromEl,
        legalMoves,
        dispatchMove,
        boardRef,
        buildKbDragFromEl,
        startKbFlight,
        lastKbMovedCardIdRef
      }),
    [
      legalMoves,
      dispatchMove,
      boardRef,
      buildKbDragFromEl,
      startKbFlight,
      tryAutoFoundationFromEl,
      getFoundationDropEl
    ]
  );

  const handleAutoFreeCell = useCallback(
    (el: HTMLElement) =>
      autoToPile(el, {
        pileType: "freecell",
        getDropEl: getFreeCellDropEl,
        tryAutoFromEl: tryAutoFreeCellFromEl,
        legalMoves,
        dispatchMove,
        boardRef,
        buildKbDragFromEl,
        startKbFlight,
        lastKbMovedCardIdRef
      }),
    [
      legalMoves,
      dispatchMove,
      boardRef,
      buildKbDragFromEl,
      startKbFlight,
      tryAutoFreeCellFromEl,
      getFreeCellDropEl
    ]
  );

  /**
   * Undo + focus restoration.
   *
   * We restore focus *after* React has committed the new state. Using rAF is the
   * simplest reliable way here.
   */

  const canUndo = useSelector(selectCanUndo);

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

  const paused = useSelector(selectPaused);
  const dispatch = useDispatch();

  const handlePauseToggle = useCallback((): void => {
    dispatch(setPaused(!paused));
  }, [dispatch, paused]);

  return {
    lastKbMovedCardIdRef,
    pendingKbDropFocusSourceRef,
    tryCommitKeyboardDrop,
    isLegalKeyboardDropTargetEl,
    handleAutoFoundation,
    handleAutoFreeCell,
    handleUndo,
    handleNewDeal,
    handleRestart,
    handlePauseToggle
  };
}
