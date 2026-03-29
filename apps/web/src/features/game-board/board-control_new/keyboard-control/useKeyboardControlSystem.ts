import type { KeyboardEvent } from "react";
import { selectIsAutoCompleting } from "@/state/game/gameSlice";
import { selectIsAnyModalOpen } from "@/state/ui/uiSlice";
import { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { onKCSTab } from "./onKCSTab";
import { moveKbFocus } from "./moveKbFocus";
import { focusFirstPlayable, focusElIfFocusable } from "./focusUtils";
import { getKbFocusables } from "./getKbFocusables";
import { stopKbCarrying, setKeyboardDropTarget } from "./keyboardCarrying";
import { Card, Move } from "@vcell/engine";
import { selectUid } from "@/state/auth/authSlice";
import { AppDispatch } from "@/state/reduxStore";
import { onKCSSpace } from "./onKCSSpace";
import { getPileRefFromElement } from "../resolveMoveAttempt";

type UseKeyboardControlSystemArgs = {
  boardRef: React.RefObject<HTMLDivElement | null>;
  tableauCards: { card: Card; faceDown: boolean }[][];
  legalMoves: Move[];
  tryAutoFreeCell: (el: HTMLElement) => void;
};

export function useKeyboardControlSystem({
  boardRef,
  tableauCards,
  legalMoves,
  tryAutoFreeCell
}: UseKeyboardControlSystemArgs) {
  const dispatch = useDispatch<AppDispatch>();

  // auth slice
  const uid = useSelector(selectUid);

  // ui slice
  const isAnyModalOpen = useSelector(selectIsAnyModalOpen);
  const isAutoCompleting = useSelector(selectIsAutoCompleting);

  // keyboard control system state
  const [kbCarrying, setKbCarrying] = useState(false);
  const [activeFocusIndex, setActiveFocusIndex] = useState(0);
  const isInputSuppressed = isAnyModalOpen || isAutoCompleting;

  // Refs for tracking focus and carry state without causing re-renders
  const lastFocusPointRef = useRef<{ x: number; y: number } | null>(null);
  const kbCarriedElRef = useRef<HTMLElement | null>(null); // if you have this concept
  const kbDropTargetElRef = useRef<HTMLElement | null>(null);

  // ----- Event handlers -----
  const onKCSKeydown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (isInputSuppressed || !boardRef.current) return;

    const els = getKbFocusables(boardRef.current);
    if (els.length === 0) return;

    // Tab: focus exists the board
    if (e.key === "Tab") {
      onKCSTab(e, setKbCarrying, boardRef);
      return;
    }

    // Space: toggle kbCarrying
    if (e.key === " ") {
      onKCSSpace(
        e,
        boardRef,
        kbCarrying,
        setKbCarrying,
        kbCarriedElRef,
        tableauCards,
        kbDropTargetElRef,
        legalMoves,
        dispatch,
        uid
      );
      return;
    }

    // Esc: stop carrying
    if (e.key === "Escape") {
      stopKbCarrying(
        boardRef.current,
        kbCarriedElRef,
        kbDropTargetElRef,
        setKbCarrying
      );
      return;
    }

    // C: tryAutoFreeCell
    if (e.key.toLowerCase() === "c") {
      const sourcePileRef = getPileRefFromElement(els[activeFocusIndex]);
      if (!sourcePileRef) return;
      tryAutoFreeCell(els[activeFocusIndex]);
    }

    // Arrow keys: move focus within the board
    const directionMap: Record<string, "left" | "right" | "up" | "down"> = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down"
    };

    if (directionMap[e.key]) {
      moveKbFocus(
        e,
        directionMap[e.key],
        els,
        activeFocusIndex,
        setActiveFocusIndex
      );
      return;
    }
  };

  const onKCSPointerDown = (e: React.PointerEvent) => {
    if (isInputSuppressed) return;

    const target = e.target as HTMLElement | null;
    if (!target) {
      // focusFirstPlayable(refreshAndGetFocusables, setActiveFocusIndex);
      focusFirstPlayable(
        () => getKbFocusables(boardRef.current),
        setActiveFocusIndex
      );
      return;
    }

    const candidate =
      (target.closest(
        "[tabindex], .card, .freecell, .foundation, .tableau-col, .tableau-empty"
      ) as HTMLElement | null) || target;

    const focused = focusElIfFocusable(
      candidate,
      () => getKbFocusables(boardRef.current),
      setActiveFocusIndex
    );
    if (!focused) return;
  };

  const onKCSFocusCapture = (e: React.FocusEvent<HTMLDivElement>) => {
    const els = getKbFocusables(boardRef.current);
    if (els.length === 0) return;

    // Board container focused (empty click) => do nothing
    if (e.target === e.currentTarget) return;

    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Ignore focus outside our system
    const idx = els.indexOf(target);
    if (idx < 0) return;

    // Sync active index
    if (idx !== activeFocusIndex) {
      setActiveFocusIndex(idx);
    }
  };

  const onKCSBlurCapture = (e: React.FocusEvent<HTMLDivElement>) => {
    const root = boardRef.current;
    if (!root) return;

    if (!root.contains(e.relatedTarget as Node | null)) {
      stopKbCarrying(root, kbCarriedElRef, kbDropTargetElRef, setKbCarrying);
    }
  };

  const onKCSFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    const root = boardRef.current;
    if (!root) return;

    const els = getKbFocusables(root);
    const target = e.target as HTMLElement;
    const idx = els.indexOf(target);

    if (idx < 0) return;

    // Sync index (safe to duplicate)
    setActiveFocusIndex(idx);

    // Track spatial position
    const r = target.getBoundingClientRect();
    lastFocusPointRef.current = {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2
    };

    // Carry mode behavior
    if (kbCarrying) {
      if (target !== kbCarriedElRef.current) {
        setKeyboardDropTarget(target, kbDropTargetElRef);
      } else {
        setKeyboardDropTarget(null, kbDropTargetElRef);
      }
    }
  };

  return {
    kbCarrying,
    stopKbCarrying,
    isInputSuppressed,
    onKCSKeydown,
    onKCSPointerDown,
    onKCSFocusCapture,
    onKCSBlurCapture,
    onKCSFocus
  };
}
