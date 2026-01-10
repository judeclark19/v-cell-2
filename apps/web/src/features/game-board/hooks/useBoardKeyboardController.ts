import type { KeyboardEvent, RefObject } from "react";

import type { Card as EngineCard } from "@vcell/engine";
import type { Move } from "@vcell/engine";

import { useKbCarryVisuals } from "./useKbCarryVisuals";
import { useKeyboardActions } from "./useKeyboardActions";
import type { DragSource } from "@/features/game-board/animations/useCardDrag";
import type { DropTarget } from "@/features/game-board/animations/useCardDrag";

type DragLike = {
  source: DragSource;
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
  dispatchMove: (m: Move) => void;
  undo: () => void;
  canUndo: boolean;
  newDeal: () => void;
  restart: () => void;
  paused: boolean;
  setPaused: (next: boolean) => void;

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
};

export function useBoardKeyboardController({
  boardRef,
  kbCarrying,
  setKbCarrying,
  legalMoves,
  dispatchMove,
  undo,
  canUndo,
  newDeal,
  restart,
  paused,
  setPaused,
  tryAutoFoundationFromEl,
  tryAutoFreeCellFromEl,
  findNextByDirection,
  buildKbDragFromEl,
  buildKbDropTargetFromEl
}: UseBoardKeyboardControllerArgs) {
  const visuals = useKbCarryVisuals({ boardRef });

  const actions = useKeyboardActions({
    boardRef,
    legalMoves,
    dispatchMove,
    undo,
    canUndo,
    newDeal,
    restart,
    paused,
    setPaused,
    tryAutoFoundationFromEl,
    tryAutoFreeCellFromEl,
    buildKbDragFromEl,
    buildKbDropTargetFromEl,
    getCarriedEl: () => visuals.carriedElRef.current,
    getDropTargetEl: () =>
      visuals.dropTargetElRef.current ||
      (document.activeElement as HTMLElement | null)
  });

  const onBoardKeyDown = (e: KeyboardEvent) => {
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

    // F: send to foundations
    if (e.key === "f" || e.key === "F") {
      e.preventDefault();
      if (!focusOrCarriedEl) return;

      actions.handleAutoFoundation(focusOrCarriedEl);

      if (kbCarrying) {
        setKbCarrying(false);
        visuals.clearKbCarryVisuals();
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
        actions.tryCommitKeyboardDrop();
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
      actions.tryCommitKeyboardDrop();
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
    onBoardKeyDown
  };
}
