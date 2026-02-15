import { useCallback, useRef } from "react";

/**
 * DOM-only visual state for keyboard carry mode.
 *
 * This hook intentionally:
 * - does NOT know about legal moves
 * - does NOT move focus
 * - does NOT dispatch game actions
 *
 * It only applies/removes CSS classes on DOM nodes inside the board.
 */
export function useKbCarryVisuals(args: {
  /** A ref to the element that contains the entire board UI (the board-border region). */
  boardRef: React.RefObject<HTMLElement | null>;
}) {
  const { boardRef } = args;

  // The element that is currently being "carried" by keyboard.
  const carriedElRef = useRef<HTMLElement | null>(null);
  // The element that is currently highlighted as a drop target.
  const dropTargetElRef = useRef<HTMLElement | null>(null);

  // Class names (centralized here so they don't get duplicated across hooks)
  const CARRYING_CLASS = "is-kb-carried";
  const DROP_TARGET_CLASS = "is-drop-target";

  const clearKbCarryVisuals = useCallback(() => {
    const root = boardRef.current;
    if (!root) return;

    // Remove classes from any previously tracked elements first.
    if (carriedElRef.current) {
      carriedElRef.current.classList.remove(CARRYING_CLASS);
      carriedElRef.current = null;
    }
    if (dropTargetElRef.current) {
      dropTargetElRef.current.classList.remove(DROP_TARGET_CLASS);
      dropTargetElRef.current = null;
    }

    // Defensive sweep: if something got out of sync, remove lingering classes.
    root
      .querySelectorAll<HTMLElement>(
        `.${CARRYING_CLASS}, .${DROP_TARGET_CLASS}`
      )
      .forEach((el) => {
        el.classList.remove(CARRYING_CLASS);
        el.classList.remove(DROP_TARGET_CLASS);
      });
  }, [boardRef]);

  const setKeyboardCarriedEl = useCallback(
    (el: HTMLElement | null) => {
      const root = boardRef.current;
      if (!root) return;

      // Clear old carried element
      if (carriedElRef.current && carriedElRef.current !== el) {
        carriedElRef.current.classList.remove(CARRYING_CLASS);
      }

      carriedElRef.current = el;
      if (carriedElRef.current) {
        carriedElRef.current.classList.add(CARRYING_CLASS);
      }
    },
    [boardRef]
  );

  /**
   * Highlight a potential drop target.
   *
   * Note: we always treat the target as a *single* element (no list), because
   * keyboard navigation focuses one thing at a time.
   */
  const setKeyboardDropTargetEl = useCallback(
    (el: HTMLElement | null) => {
      const root = boardRef.current;
      if (!root) return;

      if (dropTargetElRef.current && dropTargetElRef.current !== el) {
        dropTargetElRef.current.classList.remove(DROP_TARGET_CLASS);
      }

      dropTargetElRef.current = el;
      if (dropTargetElRef.current) {
        dropTargetElRef.current.classList.add(DROP_TARGET_CLASS);
      }
    },
    [boardRef]
  );

  return {
    /** Currently tracked carried element (DOM node). */
    carriedElRef,
    /** Currently tracked drop target element (DOM node). */
    dropTargetElRef,

    clearKbCarryVisuals,
    setKeyboardCarriedEl,
    setKeyboardDropTargetEl,

    // Export classes so Board/CSS can stay in sync without string duplication.
    CARRYING_CLASS,
    DROP_TARGET_CLASS
  };
}
