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

export type KBCarryState = {
  carrying: boolean;
  carryingLabel: string;
  activeFocusIndex: number;
};

export type KBCarryRefs = {
  lastFocusPoint: { x: number; y: number } | null;
  carriedEl: HTMLElement | null;
  dropTargetEl: HTMLElement | null;
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

  // local state and refs
  const [kbState, setKbState] = useState<KBCarryState>({
    carrying: false,
    carryingLabel: "",
    activeFocusIndex: 0
  });

  const kbCarryRefs = useRef<KBCarryRefs>({
    lastFocusPoint: null,
    carriedEl: null,
    dropTargetEl: null
  });

  // derived
  const isInputSuppressed = isAnyModalOpen || isAutoCompleting;

  // ----- Event handlers -----
  const onKCSKeydown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (isInputSuppressed || !boardRef.current) return;

    const els = getKbFocusables(boardRef.current);
    if (els.length === 0) return;

    // Tab: focus exists the board
    if (e.key === "Tab") {
      onKCSTab(e, setKbState, boardRef);
      return;
    }

    // Space: toggle kbCarrying
    if (e.key === " ") {
      onKCSSpace(
        e,
        boardRef,
        kbState,
        setKbState,
        kbCarryRefs,
        tableauCards,
        legalMoves,
        dispatch,
        uid
      );
      return;
    }

    // Esc: stop carrying
    if (e.key === "Escape") {
      stopKbCarrying(boardRef.current, kbCarryRefs, setKbState);
      return;
    }

    // C: tryAutoFreeCell
    if (e.key.toLowerCase() === "c") {
      const sourcePileRef = getPileRefFromElement(
        els[kbState.activeFocusIndex]
      );
      if (!sourcePileRef) return;
      tryAutoFreeCell(els[kbState.activeFocusIndex]);
    }

    // Arrow keys: move focus within the board
    const directionMap: Record<string, "left" | "right" | "up" | "down"> = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down"
    };

    if (directionMap[e.key]) {
      moveKbFocus(e, directionMap[e.key], els, kbState, setKbState);
      return;
    }
  };

  const onKCSPointerDown = (e: React.PointerEvent) => {
    if (isInputSuppressed) return;

    const target = e.target as HTMLElement | null;
    if (!target) {
      focusFirstPlayable(() => getKbFocusables(boardRef.current), setKbState);
      return;
    }

    const candidate =
      (target.closest(
        "[tabindex], .card, .freecell, .foundation, .tableau-col, .tableau-empty"
      ) as HTMLElement | null) || target;

    const focused = focusElIfFocusable(
      candidate,
      () => getKbFocusables(boardRef.current),
      setKbState
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
    if (idx !== kbState.activeFocusIndex) {
      setKbState((prev) => ({ ...prev, activeFocusIndex: idx }));
    }
  };

  const onKCSBlurCapture = (e: React.FocusEvent<HTMLDivElement>) => {
    const root = boardRef.current;
    if (!root) return;

    if (!root.contains(e.relatedTarget as Node | null)) {
      stopKbCarrying(root, kbCarryRefs, setKbState);
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
    setKbState((prev) => ({ ...prev, activeFocusIndex: idx }));

    // Track spatial position
    const r = target.getBoundingClientRect();
    kbCarryRefs.current.lastFocusPoint = {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2
    };

    // Carry mode behavior
    if (kbState.carrying) {
      if (target !== kbCarryRefs.current.carriedEl) {
        setKeyboardDropTarget(target, kbCarryRefs);
      } else {
        setKeyboardDropTarget(null, kbCarryRefs);
      }
    }
  };

  return {
    kbState,
    stopKbCarrying,
    isInputSuppressed,
    onKCSKeydown,
    onKCSPointerDown,
    onKCSFocusCapture,
    onKCSBlurCapture,
    onKCSFocus
  };
}
