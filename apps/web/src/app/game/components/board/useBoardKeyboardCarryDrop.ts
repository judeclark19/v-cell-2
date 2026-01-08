import { useCallback, useRef } from "react";
import type { KeyboardEvent, RefObject } from "react";

import type { DropTarget, DragSource } from "@/ui/useCardDrag";
import { commitBoardDrop } from "./useBoardDrop";

import type { Card as EngineCard } from "@vcell/engine";
import type { Move } from "@vcell/engine";

type DragLike = {
  source: DragSource;
  stack: Array<{ card: EngineCard; faceDown: boolean }>;
};

type UseBoardKeyboardCarryDropArgs = {
  /** Root element that contains the board focusables (used to clear kb classes). */
  boardRef: RefObject<HTMLElement | null>;

  /** Whether keyboard carry mode is currently active (controlled by Board). */
  kbCarrying: boolean;

  /** Setter for keyboard carry mode (controlled by Board). */
  setKbCarrying: (next: boolean) => void;

  /** Engine state is not needed directly here; mapping is provided by callbacks. */
  legalMoves: Move[];
  dispatchMove: (m: Move) => void;

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

export function useBoardKeyboardCarryDrop({
  boardRef,
  kbCarrying,
  setKbCarrying,
  legalMoves,
  dispatchMove,
  tryAutoFoundationFromEl,
  tryAutoFreeCellFromEl,
  findNextByDirection,
  buildKbDragFromEl,
  buildKbDropTargetFromEl
}: UseBoardKeyboardCarryDropArgs) {
  const kbCarriedElRef = useRef<HTMLElement | null>(null);
  const kbDropTargetElRef = useRef<HTMLElement | null>(null);

  const clearKbCarryVisuals = useCallback(() => {
    const root = boardRef.current;

    // Remove any kb-only classes we add during carry.
    if (root) {
      root
        .querySelectorAll<HTMLElement>(
          ".is-kb-carried, .is-kb-carried-stack, .is-kb-drop-target"
        )
        .forEach((el) => {
          el.classList.remove(
            "is-kb-carried",
            "is-kb-carried-stack",
            "is-kb-drop-target"
          );
        });
    } else {
      // Fallback: at least clean up the explicit refs.
      kbCarriedElRef.current?.classList.remove(
        "is-kb-carried",
        "is-kb-carried-stack"
      );
      kbDropTargetElRef.current?.classList.remove("is-kb-drop-target");
    }

    kbCarriedElRef.current = null;
    kbDropTargetElRef.current = null;
  }, [boardRef]);

  const setKeyboardDropTarget = useCallback(
    (el: HTMLElement | null) => {
      // Clear old
      if (kbDropTargetElRef.current && kbDropTargetElRef.current !== el) {
        kbDropTargetElRef.current.classList.remove("is-kb-drop-target");
      }

      kbDropTargetElRef.current = el;

      if (el && kbCarrying) {
        el.classList.add("is-kb-drop-target");
      }
    },
    [kbCarrying]
  );

  const setKeyboardCarriedEl = useCallback((el: HTMLElement | null) => {
    // Clear old
    if (kbCarriedElRef.current && kbCarriedElRef.current !== el) {
      kbCarriedElRef.current.classList.remove(
        "is-kb-carried",
        "is-kb-carried-stack"
      );
    }

    kbCarriedElRef.current = el;

    if (el) {
      el.classList.add("is-kb-carried");
    }
  }, []);

  const tryCommitKeyboardDrop = useCallback(() => {
    const carriedEl = kbCarriedElRef.current;
    if (!carriedEl) return false;

    const targetEl =
      kbDropTargetElRef.current ||
      (document.activeElement as HTMLElement | null);
    if (!targetEl) return false;

    const dragLike = buildKbDragFromEl(carriedEl);
    if (!dragLike) return false;

    const dropTarget = buildKbDropTargetFromEl(targetEl);
    if (!dropTarget) return false;

    return commitBoardDrop({
      drag: { source: dragLike.source, stack: dragLike.stack },
      dropTarget,
      legalMoves,
      dispatchMove
    });
  }, [buildKbDragFromEl, buildKbDropTargetFromEl, dispatchMove, legalMoves]);

  const onBoardKeyDown = useCallback(
    (e: KeyboardEvent) => {
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

      // Quick actions (even when not in carry mode):
      // - F: send to foundations
      // - C: send to free cells
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();

        const el =
          (kbCarrying && kbCarriedElRef.current) ||
          (document.activeElement as HTMLElement | null);
        if (!el) return;

        const dragLike = buildKbDragFromEl(el);

        // Prefer dispatching directly from engine legalMoves, since engine uses
        // tableau refs as { type: "tableau", index } (column index), not { colIndex, startIndex }.
        if (dragLike) {
          const matchingMoves = legalMoves
            .filter((m) => m.kind === "single" && m.to.type === "foundation")
            .filter((m) => {
              if (dragLike.source.type === "tableau") {
                return (
                  m.from.type === "tableau" &&
                  m.from.index === dragLike.source.colIndex
                );
              }
              if (dragLike.source.type === "freecell") {
                return (
                  m.from.type === "freecell" &&
                  m.from.index === dragLike.source.index
                );
              }
              if (dragLike.source.type === "foundation") {
                return (
                  m.from.type === "foundation" &&
                  m.from.index === dragLike.source.index
                );
              }
              return false;
            })
            // Deterministic: pick the lowest foundation slot.
            .sort((a, b) => a.to.index - b.to.index);

          if (matchingMoves.length > 0) {
            dispatchMove(matchingMoves[0]);

            // If we were carrying, treat this as a commit and exit carry mode.
            if (kbCarrying) {
              setKbCarrying(false);
              clearKbCarryVisuals();
            }

            return;
          }
        }

        tryAutoFoundationFromEl(el);

        // If we were carrying, treat this as a commit and exit carry mode.
        if (kbCarrying) {
          setKbCarrying(false);
          clearKbCarryVisuals();
        }

        return;
      }

      if (e.key === "c" || e.key === "C") {
        e.preventDefault();

        const el =
          (kbCarrying && kbCarriedElRef.current) ||
          (document.activeElement as HTMLElement | null);
        if (!el) return;

        const dragLike = buildKbDragFromEl(el);

        // Prefer dispatching directly from engine legalMoves, since engine uses
        // tableau refs as { type: "tableau", index } (column index), not { colIndex, startIndex }.
        if (dragLike) {
          const matchingMoves = legalMoves
            .filter((m) => m.kind === "single" && m.to.type === "freecell")
            .filter((m) => {
              if (dragLike.source.type === "tableau") {
                // Engine tableau move refs use `index` == column index.
                return (
                  m.from.type === "tableau" &&
                  m.from.index === dragLike.source.colIndex
                );
              }
              if (dragLike.source.type === "freecell") {
                return (
                  m.from.type === "freecell" &&
                  m.from.index === dragLike.source.index
                );
              }
              if (dragLike.source.type === "foundation") {
                return (
                  m.from.type === "foundation" &&
                  m.from.index === dragLike.source.index
                );
              }
              return false;
            })
            // Deterministic: pick the lowest freecell slot.
            .sort((a, b) => a.to.index - b.to.index);

          if (matchingMoves.length > 0) {
            dispatchMove(matchingMoves[0]);

            // If we were carrying, treat this as a commit and exit carry mode.
            if (kbCarrying) {
              setKbCarrying(false);
              clearKbCarryVisuals();
            }

            return;
          }
        }

        tryAutoFreeCellFromEl(el);

        if (kbCarrying) {
          setKbCarrying(false);
          clearKbCarryVisuals();
        }

        return;
      }

      // Escape cancels carry mode.
      if (e.key === "Escape" && kbCarrying) {
        e.preventDefault();
        setKbCarrying(false);
        clearKbCarryVisuals();
        return;
      }

      // Space toggles carry mode.
      if (e.key === " ") {
        e.preventDefault();

        if (kbCarrying) {
          // Attempt drop, then exit carry mode.
          tryCommitKeyboardDrop();
          clearKbCarryVisuals();
          setKbCarrying(false);
          return;
        }

        // Enter carry mode: pick up the currently focused element.
        const activeEl = document.activeElement as HTMLElement | null;
        if (activeEl) {
          setKeyboardCarriedEl(activeEl);
        }

        setKbCarrying(true);
        return;
      }

      // Enter commits while carrying.
      if (e.key === "Enter" && kbCarrying) {
        e.preventDefault();
        tryCommitKeyboardDrop();
        setKbCarrying(false);
        clearKbCarryVisuals();
        return;
      }
    },
    [
      buildKbDragFromEl,
      clearKbCarryVisuals,
      dispatchMove,
      findNextByDirection,
      kbCarrying,
      legalMoves,
      setKbCarrying,
      setKeyboardCarriedEl,
      tryAutoFoundationFromEl,
      tryAutoFreeCellFromEl,
      tryCommitKeyboardDrop
    ]
  );

  return {
    kbCarriedElRef,
    kbDropTargetElRef,
    clearKbCarryVisuals,
    setKeyboardCarriedEl,
    setKeyboardDropTarget,
    tryCommitKeyboardDrop,
    onBoardKeyDown
  };
}
