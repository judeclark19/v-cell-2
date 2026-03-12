import type { KeyboardEvent, RefObject } from "react";

import type { Card as EngineCard } from "@vcell/engine";
import type { Move } from "@vcell/engine";

import { useKbCarryVisuals } from "./useKbCarryVisuals";
import { useKeyboardActions } from "./useKeyboardActions";
import { DragSource, DropTarget } from "../animations/dragTypes";
import { selectCanUndo } from "@/state/game/gameSlice";
import { useSelector } from "react-redux";

type DragLike = {
  source: DragSource | null;
  stack: Array<{ card: EngineCard; faceDown: boolean }>;
};

type UseBoardKeyboardControllerArgs = {
  /** Root element that contains the board focusables (used to clear kb classes). */
  boardRef: RefObject<HTMLElement | null>;

  /** Whether keyboard carry mode is currently active (controlled by Board). */
  kbCarrying: boolean;

  /** Setter for keyboard carry mode (controlled by Board). */
  setKbCarrying: (next: boolean) => void;

  legalMoves: Move[];
  makeMove: (m: Move) => void;
  undo: () => void;
  newDeal: () => void;
  restart: () => void;

  /** Whether input is currently suppressed (e.g., due to a modal or auto-completing). */
  isInputSuppressed: boolean;

  /** Attempt to send the focused (or carried) card to a legal foundation slot. */
  tryAutoFoundationFromEl: (el: HTMLElement) => boolean;

  /** Attempt to send the focused (or carried) card to a legal free cell slot. */
  tryAutoFreeCellFromEl: (el: HTMLElement) => boolean;

  /** Arrow-key navigation callback provided by useBoardKeyboardNav. */
  findNextByDirection: (dir: "left" | "right" | "up" | "down") => void;

  /** Map a focused/carried DOM element -> drag-like source/stack. */
  buildKbDragFromEl: (el: HTMLElement) => DragLike | null;

  /** Map a focused DOM element -> a board drop target. */
  buildKbDropTargetFromEl: (el: HTMLElement) => DropTarget | null;

  /** Starts a visual-only keyboard flight animation for a committed keyboard move. */
  startKbFlight: (args: {
    fromEl: HTMLElement;
    toEl: HTMLElement;
    kbDrag: DragLike;
    dropTarget: NonNullable<DropTarget>;
  }) => void;

  getFoundationDropEl: (index: number) => HTMLElement | null;
  getFreeCellDropEl: (index: number) => HTMLElement | null;
};

export function useBoardKeyboardController({
  boardRef,
  kbCarrying,
  setKbCarrying,
  legalMoves,
  makeMove,
  undo,
  newDeal,
  restart,
  isInputSuppressed,
  tryAutoFoundationFromEl,
  tryAutoFreeCellFromEl,
  findNextByDirection,
  buildKbDragFromEl,
  buildKbDropTargetFromEl,
  startKbFlight,
  getFoundationDropEl,
  getFreeCellDropEl
}: UseBoardKeyboardControllerArgs) {
  const visuals = useKbCarryVisuals({ boardRef });
  const canUndo = useSelector(selectCanUndo);

  const actions = useKeyboardActions({
    boardRef,
    legalMoves,
    makeMove,
    undo,
    newDeal,
    restart,
    tryAutoFoundationFromEl,
    tryAutoFreeCellFromEl,
    buildKbDragFromEl,
    buildKbDropTargetFromEl,
    startKbFlight,
    getCarriedEl: () => visuals.carriedElRef.current,
    getDropTargetEl: () =>
      visuals.dropTargetElRef.current ||
      (document.activeElement as HTMLElement | null),
    getFoundationDropEl,
    getFreeCellDropEl
  });

  const onBoardKeyDown = (e: KeyboardEvent) => {
    if (isInputSuppressed) return;
    // Let Tab / Shift+Tab escape the board (or at least allow the browser to do its normal
    // focus order traversal). We explicitly avoid preventing default here.
    // Also: if we're in keyboard-carry mode, cancel it so we don't keep carry visuals stuck
    // while focus moves elsewhere.
    if (e.key === "Tab") {
      // Always cancel carry visuals when leaving via Tab.
      setKbCarrying(false);
      visuals.clearKbCarryVisuals();

      // Forward Tab can use the browser's normal traversal.
      if (!e.shiftKey) return;

      // Shift+Tab: if something elsewhere is trapping focus back into the board,
      // manually focus the previous focusable element that is NOT inside the board.
      const boardEl = boardRef.current;
      const activeEl = document.activeElement as HTMLElement | null;
      if (!boardEl || !activeEl) return;

      const focusables = Array.from(
        document.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => {
        // Skip elements not actually tabbable/visible.
        if (el.tabIndex < 0) return false;
        const ariaDisabled = el.getAttribute("aria-disabled");
        if (ariaDisabled === "true") return false;
        // Basic visibility check: offsetParent is null for display:none; fixed elements still have an offsetParent.
        // Also allow SVG/edge cases by checking bounding rect.
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return false;
        return true;
      });

      const idx = focusables.indexOf(activeEl);
      if (idx <= 0) return;

      for (let i = idx - 1; i >= 0; i--) {
        const candidate = focusables[i];
        if (boardEl.contains(candidate)) continue;

        e.preventDefault();
        candidate.focus();
        return;
      }

      return;
    }
    // Arrow-key navigation always works within the board.
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      findNextByDirection("left");
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      findNextByDirection("right");
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      findNextByDirection("up");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      findNextByDirection("down");
      return;
    }

    const carriedEl = visuals.carriedElRef.current;
    const activeEl = document.activeElement as HTMLElement | null;
    const focusOrCarriedEl = (kbCarrying && carriedEl) || activeEl;

    const boardEl = boardRef.current;
    const hasDeclaredDropTargets = Boolean(
      boardEl?.querySelector('[data-kb-drop-target="true"]')
    );

    const getEffectiveDropFocusEl = () => {
      return (
        visuals.dropTargetElRef.current ||
        (document.activeElement as HTMLElement | null)
      );
    };

    const isDeclaredDropTarget = (el: HTMLElement | null) => {
      if (!el) return false;
      return Boolean(el.closest('[data-kb-drop-target="true"]'));
    };

    const maybeCommitKeyboardDrop = () => {
      if (!hasDeclaredDropTargets) {
        actions.tryCommitKeyboardDrop();
        return;
      }

      const dropFocusEl = getEffectiveDropFocusEl();
      if (!isDeclaredDropTarget(dropFocusEl)) {
        return;
      }

      actions.tryCommitKeyboardDrop();
    };

    // F: send to foundations
    if (e.key === "f" || e.key === "F") {
      e.preventDefault();
      if (!focusOrCarriedEl) return;

      // If the focused element is a card inside a freecell, keep focus on that freecell slot
      // after the move (so focus doesn't jump up to tableau due to element replacement).
      const dragLike = buildKbDragFromEl(focusOrCarriedEl);
      const fromFreecell = dragLike?.source?.type === "freecell";

      // Best-effort: capture the slot container element now; it should persist when emptied.
      const freecellSlotEl =
        (focusOrCarriedEl.closest(
          '[data-region="freecell"], [data-pile-type="freecell"], [data-freecell-index], .freecell, .freecell-cell, .pile-cell'
        ) as HTMLElement | null) ?? null;

      const didMove = actions.handleAutoFoundation(focusOrCarriedEl);

      if (kbCarrying) {
        setKbCarrying(false);
        visuals.clearKbCarryVisuals();
      }

      // Restore focus to the originating freecell slot if that's where the move came from.
      if (didMove && fromFreecell) {
        requestAnimationFrame(() => {
          if (freecellSlotEl && freecellSlotEl.isConnected) {
            freecellSlotEl.focus();
          }
        });
      }

      return;
    }

    // C: send to free cells
    if (e.key === "c" || e.key === "C") {
      e.preventDefault();
      if (!focusOrCarriedEl) return;

      actions.handleAutoFreeCell(focusOrCarriedEl);

      if (kbCarrying) {
        setKbCarrying(false);
        visuals.clearKbCarryVisuals();
      }
      return;
    }

    // U: undo
    if (e.key === "u" || e.key === "U") {
      e.preventDefault();
      if (!canUndo) return;

      actions.handleUndo(focusOrCarriedEl);

      if (kbCarrying) {
        setKbCarrying(false);
        visuals.clearKbCarryVisuals();
      }
      return;
    }

    // N: new deal
    if (e.key === "n" || e.key === "N") {
      e.preventDefault();

      actions.handleNewDeal();

      if (kbCarrying) {
        setKbCarrying(false);
        visuals.clearKbCarryVisuals();
      }
      return;
    }

    // R: restart
    if (e.key === "r" || e.key === "R") {
      e.preventDefault();

      actions.handleRestart();

      if (kbCarrying) {
        setKbCarrying(false);
        visuals.clearKbCarryVisuals();
      }
      return;
    }

    // P: pause toggle
    if (e.key === "p" || e.key === "P") {
      e.preventDefault();

      actions.handlePauseToggle();

      if (kbCarrying) {
        setKbCarrying(false);
        visuals.clearKbCarryVisuals();
      }
      return;
    }

    // Escape cancels carry mode.
    if (e.key === "Escape" && kbCarrying) {
      e.preventDefault();
      setKbCarrying(false);
      visuals.clearKbCarryVisuals();
      return;
    }

    // Space toggles carry mode.
    if (e.key === " ") {
      e.preventDefault();

      if (kbCarrying) {
        maybeCommitKeyboardDrop();
        visuals.clearKbCarryVisuals();
        setKbCarrying(false);
        return;
      }

      if (activeEl) {
        visuals.setKeyboardCarriedEl(activeEl);
      }

      setKbCarrying(true);
      return;
    }

    // Enter commits while carrying.
    if (e.key === "Enter" && kbCarrying) {
      e.preventDefault();
      maybeCommitKeyboardDrop();
      setKbCarrying(false);
      visuals.clearKbCarryVisuals();
      return;
    }
  };

  return {
    kbCarriedElRef: visuals.carriedElRef,
    kbDropTargetElRef: visuals.dropTargetElRef,
    clearKbCarryVisuals: visuals.clearKbCarryVisuals,
    setKeyboardCarriedEl: visuals.setKeyboardCarriedEl,
    setKeyboardDropTarget: visuals.setKeyboardDropTargetEl,
    onBoardKeyDown,

    isLegalKeyboardDropTargetEl: actions.isLegalKeyboardDropTargetEl,
    pendingKbDropFocusSourceRef: actions.pendingKbDropFocusSourceRef
  };
}
