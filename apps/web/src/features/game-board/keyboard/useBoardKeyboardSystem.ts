import { useCallback, useEffect, useRef, useState } from "react";

import { type BoardKbAttrsContextValue, useBoardKbAttrs } from "./boardKbAttrs";
import { useBoardKeyboardNav } from "./useBoardKeyboardNav";
import { useBoardKeyboardController } from "./useBoardKeyboardController";

type NavArgs = Parameters<typeof useBoardKeyboardNav>[0];
type CtrlArgs = Parameters<typeof useBoardKeyboardController>[0];
type KbAttrsArgs = Parameters<typeof useBoardKbAttrs>[0];
type KbDrag = NonNullable<ReturnType<CtrlArgs["buildKbDragFromEl"]>>;
type KbDropTarget = ReturnType<CtrlArgs["buildKbDropTargetFromEl"]>;

export type UseBoardKeyboardSystemArgs = {
  isInputSuppressed: boolean;

  // from kb-attrs (strongly typed)
  state: KbAttrsArgs["state"];
  playable: KbAttrsArgs["playable"];
  getNodeMeta: NavArgs["getNodeMeta"];
  isLegalDropTargetEl: NonNullable<NavArgs["isLegalDropTargetEl"]>;

  // kb attrs
  getKbAttrsForElCore: KbAttrsArgs["getKbAttrsForElCore"];

  // controller mapping + auto moves
  buildKbDragFromEl: CtrlArgs["buildKbDragFromEl"];
  buildKbDropTargetFromEl: CtrlArgs["buildKbDropTargetFromEl"];
  tryAutoFoundationFromEl: CtrlArgs["tryAutoFoundationFromEl"];
  tryAutoFreeCellFromEl: CtrlArgs["tryAutoFreeCellFromEl"];

  // controller game actions
  makeMove: CtrlArgs["makeMove"]; // you will pass commitMoveFromKeyboard here
  undo: CtrlArgs["undo"];
  newDeal: CtrlArgs["newDeal"];
  restart: CtrlArgs["restart"];

  // controller data
  legalMoves: CtrlArgs["legalMoves"];

  /** Starts a visual-only keyboard "flight" animation for a committed keyboard move. */
  startKbFlight: (args: {
    fromEl: HTMLElement;
    toEl: HTMLElement;
    kbDrag: KbDrag;
    dropTarget: NonNullable<KbDropTarget>;
  }) => void;

  getFoundationDropEl: (index: number) => HTMLElement | null;
  getFreeCellDropEl: (index: number) => HTMLElement | null;
};

export type UseBoardKeyboardSystemResult = {
  boardRef: React.RefObject<HTMLDivElement | null>;
  kbAttrsContextValue: BoardKbAttrsContextValue;
  onBoardKeyDown: React.KeyboardEventHandler<HTMLDivElement>;
  onBoardFocusCapture: React.FocusEventHandler<HTMLDivElement>;
  onBoardBlurCapture: React.FocusEventHandler<HTMLDivElement>;
  onBoardFocus: React.FocusEventHandler<HTMLDivElement>;
  onBoardPointerDownCapture: React.PointerEventHandler<HTMLDivElement>;
  kbCarrying: boolean;
  commitMoveFromKeyboard: CtrlArgs["makeMove"];
};

/**
 * Owns the entire keyboard interaction system for the board:
 * - carry mode
 * - focus navigation
 * - keyboard command handling
 * - kb attribute computation
 *
 * IMPORTANT: This hook must match the *existing* hook APIs.
 * - `useBoardKeyboardNav` returns refs/handlers; it does NOT accept refs.
 * - `useBoardKeyboardController` owns keydown; it does NOT accept focusablesRef/hadBoardFocusRef.
 * - `useBoardKbAttrs` returns an object containing `kbAttrsContextValue`.
 */
export function useBoardKeyboardSystem({
  isInputSuppressed,
  state,
  playable,
  getNodeMeta,
  getKbAttrsForElCore,
  isLegalDropTargetEl,
  buildKbDragFromEl,
  buildKbDropTargetFromEl,
  tryAutoFoundationFromEl,
  tryAutoFreeCellFromEl,
  makeMove,
  undo,
  newDeal,
  restart,
  legalMoves,
  startKbFlight,
  getFoundationDropEl,
  getFreeCellDropEl
}: UseBoardKeyboardSystemArgs): UseBoardKeyboardSystemResult {
  const [kbCarrying, setKbCarrying] = useState(false);
  const lastRestoredFocusStampRef = useRef(0);

  // --- navigation (focus math + roving tabindex) ---
  const {
    boardRef,
    focusablesRef,
    hadBoardFocusRef,
    onBoardFocusCapture: onNavFocusCapture,
    focusFirstPlayable,
    focusElIfFocusable,
    setActiveFocusIndex,
    lastFocusPointRef,
    getCenter,
    findNextByDirection
  } = useBoardKeyboardNav({
    state,
    playable,
    kbCarrying,
    getNodeMeta,
    isLegalDropTargetEl
  });

  // --- keyboard commands (enter, space, F/C shortcuts, arrows, etc.) ---
  const {
    onBoardKeyDown: onControllerKeyDown,
    clearKbCarryVisuals,
    kbCarriedElRef,
    setKeyboardDropTarget,
    pendingKbDropFocusSourceRef
  } = useBoardKeyboardController({
    boardRef,
    isInputSuppressed,
    legalMoves,
    kbCarrying,
    setKbCarrying,
    makeMove,
    undo,
    newDeal,
    restart,
    tryAutoFoundationFromEl,
    tryAutoFreeCellFromEl,
    findNextByDirection,
    buildKbDragFromEl,
    buildKbDropTargetFromEl,
    startKbFlight,
    getFoundationDropEl,
    getFreeCellDropEl
  });

  // --- kb attrs (tabIndex, aria, data-kb-*) ---
  const { kbAttrsContextValue } = useBoardKbAttrs({
    kbCarrying,
    state,
    playable,
    getKbAttrsForElCore,
    isLegalDropTargetEl
  });

  // Board-level handlers (previously inlined in Board)
  const onBoardKeyDown = useCallback<
    React.KeyboardEventHandler<HTMLDivElement>
  >(
    (e) => {
      if (isInputSuppressed) return;
      if (!e.defaultPrevented) onControllerKeyDown(e);
    },
    [isInputSuppressed, onControllerKeyDown]
  );

  const onBoardPointerDownCapture = useCallback<
    React.PointerEventHandler<HTMLDivElement>
  >(
    (e) => {
      if (isInputSuppressed) return;

      const target = e.target as HTMLElement | null;
      if (!target) {
        focusFirstPlayable();
        return;
      }

      const candidate =
        (target.closest(
          "[tabindex], .card, .freecell, .foundation, .tableau-col, .tableau-empty"
        ) as HTMLElement | null) || target;

      const focused = focusElIfFocusable(candidate);
      if (!focused) return;
    },
    [isInputSuppressed, focusElIfFocusable, focusFirstPlayable]
  );

  const onBoardBlurCapture = useCallback<
    React.FocusEventHandler<HTMLDivElement>
  >(
    (e) => {
      const root = boardRef.current;
      if (root && !root.contains(e.relatedTarget as Node | null)) {
        hadBoardFocusRef.current = false;
        setKbCarrying(false);
        clearKbCarryVisuals();
      }
    },
    [boardRef, clearKbCarryVisuals, hadBoardFocusRef]
  );

  const onBoardFocus = useCallback<React.FocusEventHandler<HTMLDivElement>>(
    (e) => {
      const els = focusablesRef.current;
      const target = e.target as HTMLElement;
      const idx = els.indexOf(target);

      if (idx >= 0) {
        setActiveFocusIndex(idx);
        lastFocusPointRef.current = getCenter(target);

        if (kbCarrying) {
          if (target !== kbCarriedElRef.current) {
            setKeyboardDropTarget(target);
          } else {
            setKeyboardDropTarget(null);
          }
        }
      }
    },
    [
      focusablesRef,
      getCenter,
      kbCarrying,
      kbCarriedElRef,
      lastFocusPointRef,
      setActiveFocusIndex,
      setKeyboardDropTarget
    ]
  );

  const onBoardFocusCapture = useCallback<
    React.FocusEventHandler<HTMLDivElement>
  >(
    (e) => {
      if (isInputSuppressed) return;
      hadBoardFocusRef.current = true;
      // Forward the event into nav's focus capture handler.
      onNavFocusCapture(e);
    },
    [isInputSuppressed, hadBoardFocusRef, onNavFocusCapture]
  );

  useEffect(() => {
    const source = pendingKbDropFocusSourceRef.current;
    if (!source) return;

    // Only restore for tableau sources (your requested behavior).
    if (source.type !== "tableau") {
      pendingKbDropFocusSourceRef.current = null;
      return;
    }

    // Prevent double-restores on rapid rerenders.
    const stamp = Date.now();
    if (stamp === lastRestoredFocusStampRef.current) return;
    lastRestoredFocusStampRef.current = stamp;

    // We wait a couple frames so the move + any kb flight settles in the DOM.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const els = focusablesRef.current;
        const desiredTcIndex = source.startIndex - 1;

        const findFocusable = (predicate: (el: HTMLElement) => boolean) => {
          for (const el of els) {
            if (predicate(el)) return el;
          }
          return null;
        };

        const elToFocus =
          desiredTcIndex >= 0
            ? findFocusable((el) => {
                const meta = getNodeMeta(el);
                return (
                  meta?.region === "tableau" &&
                  meta.tableauCol === source.colIndex &&
                  meta.tableauIndex === desiredTcIndex
                );
              })
            : findFocusable((el) => {
                const meta = getNodeMeta(el);
                return (
                  meta?.region === "tableau" &&
                  meta.tableauCol === source.colIndex &&
                  meta.tableauIndex === -1
                );
              });

        if (elToFocus) {
          focusElIfFocusable(elToFocus);
        }

        // Consume the request (one-shot).
        pendingKbDropFocusSourceRef.current = null;
      });
    });
  }, [
    getNodeMeta,
    focusElIfFocusable,
    focusablesRef,
    pendingKbDropFocusSourceRef
  ]);

  return {
    boardRef,
    kbAttrsContextValue,
    onBoardKeyDown,
    onBoardFocusCapture,
    onBoardBlurCapture,
    onBoardFocus,
    onBoardPointerDownCapture,
    kbCarrying,
    commitMoveFromKeyboard: makeMove
  };
}
