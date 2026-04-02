import {
  selectIsAutoCompleting,
  selectMoveCount,
  selectStatus
} from "@/state/game/gameSlice";
import {
  closePauseModal,
  openPauseModal,
  selectIsAnyModalOpen
} from "@/state/ui/uiSlice";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { onKCSTab } from "./onKCSTab";
import { focusOnPileRef, moveKbFocus } from "./moveKbFocus";
import { focusFirstPlayable, focusElIfFocusable } from "./focusUtils";
import { getKbFocusables } from "./getKbFocusables";
import { stopKbCarrying, setKeyboardDropTarget } from "./keyboardCarrying";
import { Card, Move, PileRef } from "@vcell/engine";
import { selectUid } from "@/state/auth/authSlice";
import { AppDispatch } from "@/state/reduxStore";
import { onKCSSpace } from "./onKCSSpace";
import { getPileRefFromElement } from "../resolveMoveAttempt";
import { StartCardFlightArgs } from "../useCardFlight";
import {
  selectPaused,
  selectStartedAtMs,
  setPaused
} from "@/state/session/sessionSlice";
import { requestConfirmation } from "@/state/ui/requestConfirmation";

type UseKeyboardControlSystemArgs = {
  boardRef: React.RefObject<HTMLDivElement | null>;
  foundationCards: Array<Card | null>;
  tableauCards: { card: Card; faceDown: boolean }[][];
  freeCellCards: Array<Card | null>;
  legalMoves: Move[];
  tryAutoFreeCell: (el: HTMLElement) => boolean;
  tryAutoFoundation: (el: HTMLElement) => boolean;
  startCardFlight: (args: StartCardFlightArgs) => void;
  newDeal: () => void;
  restart: () => void;
  undo: () => void;
};

export type KBCarryState = {
  carrying: boolean;
  carryingLabel: string | null;
  activeFocusIndex: number;
};

export type KBCarryRefs = {
  lastFocusPoint: { x: number; y: number } | null;
  carriedEl: HTMLElement | null;
  dropTargetEl: HTMLElement | null;
  pendingFocusPileRef: PileRef | null;
};

export function useKeyboardControlSystem({
  boardRef,
  foundationCards,
  tableauCards,
  freeCellCards,
  legalMoves,
  tryAutoFreeCell,
  tryAutoFoundation,
  startCardFlight,
  newDeal,
  restart,
  undo
}: UseKeyboardControlSystemArgs) {
  const dispatch = useDispatch<AppDispatch>();

  // auth slice
  const uid = useSelector(selectUid);

  // Session slice
  const startedAtMs = useSelector(selectStartedAtMs);
  const paused = useSelector(selectPaused);

  // game slice
  const isAutoCompleting = useSelector(selectIsAutoCompleting);
  const moveCount = useSelector(selectMoveCount);
  const status = useSelector(selectStatus);

  // ui slice
  const isAnyModalOpen = useSelector(selectIsAnyModalOpen);

  // local state and refs
  const [kbState, setKbState] = useState<KBCarryState>({
    carrying: false,
    carryingLabel: null,
    activeFocusIndex: 0
  });

  const kbRefs = useRef<KBCarryRefs>({
    lastFocusPoint: null,
    carriedEl: null,
    dropTargetEl: null,
    pendingFocusPileRef: null
  });

  // derived
  const isInputSuppressed = isAnyModalOpen || isAutoCompleting;

  const isTypingTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;

    const tag = target.tagName;
    return (
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      target.isContentEditable
    );
  };

  useEffect(() => {
    if (!kbRefs.current.pendingFocusPileRef) return;

    focusOnPileRef(kbRefs.current.pendingFocusPileRef);
    kbRefs.current.pendingFocusPileRef = null;
    console.log("pending focus pile ref effect ran");
  }, [moveCount]);

  // ----- Event handlers -----
  const handleGameKeydown = useCallback(
    async (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (isTypingTarget(e.target)) return;

      if (e.key.toLowerCase() === "p") {
        e.preventDefault();
        if (paused && isAnyModalOpen) {
          dispatch(closePauseModal());
          dispatch(setPaused(false));
        } else if (!paused) {
          dispatch(openPauseModal());
          dispatch(setPaused(true));
        }
        return;
      }

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
          kbRefs,
          startCardFlight,
          foundationCards,
          tableauCards,
          freeCellCards,
          legalMoves,
          dispatch,
          uid
        );
        return;
      }

      // Esc: stop carrying
      if (e.key === "Escape") {
        stopKbCarrying(boardRef.current, kbRefs, setKbState);
        return;
      }

      // N: new deal (with confirm first)
      if (e.key.toLowerCase() === "n") {
        const ok =
          !(startedAtMs && status === "in_progress") ||
          (await requestConfirmation({
            title: "Start a new deal?",
            bodyText: "Starting a new deal will abandon your current game.",
            confirmLabel: "New deal",
            cancelLabel: "Cancel"
          }));
        if (!ok) return;
        newDeal();
        return;
      }

      // R: restart
      if (e.key.toLowerCase() === "r") {
        restart();
      }

      // U: undo
      if (e.key.toLowerCase() === "u") {
        undo();
      }

      // C: tryAutoFreeCell
      if (e.key.toLowerCase() === "c") {
        const didMove = tryAutoFreeCell(els[kbState.activeFocusIndex]);
        if (didMove) {
          kbRefs.current.pendingFocusPileRef = getPileRefFromElement(
            els[kbState.activeFocusIndex]
          );
        }
      }

      // F: tryAutoFoundation
      if (e.key.toLowerCase() === "f") {
        const didMove = tryAutoFoundation(els[kbState.activeFocusIndex]);

        if (didMove) {
          console.log("did autofoundation F ");
          kbRefs.current.pendingFocusPileRef = getPileRefFromElement(
            els[kbState.activeFocusIndex]
          );
        }
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
    },
    [
      boardRef,
      dispatch,
      foundationCards,
      freeCellCards,
      isAnyModalOpen,
      isInputSuppressed,
      kbState,
      legalMoves,
      newDeal,
      restart,
      undo,
      paused,
      startedAtMs,
      startCardFlight,
      status,
      tableauCards,
      tryAutoFoundation,
      tryAutoFreeCell,
      uid
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleGameKeydown);
    return () => {
      window.removeEventListener("keydown", handleGameKeydown);
    };
  }, [handleGameKeydown]);

  const onKCSKeydown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      void handleGameKeydown(e.nativeEvent);
    },
    [handleGameKeydown]
  );

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
      stopKbCarrying(root, kbRefs, setKbState);
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
    kbRefs.current.lastFocusPoint = {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2
    };

    // Carry mode behavior
    if (kbState.carrying) {
      if (target !== kbRefs.current.carriedEl) {
        setKeyboardDropTarget(target, kbRefs);
      } else {
        setKeyboardDropTarget(null, kbRefs);
      }
    }
  };

  return {
    kbState,
    kbRefs,
    stopKbCarrying,
    isInputSuppressed,
    onKCSKeydown,
    onKCSPointerDown,
    onKCSFocusCapture,
    onKCSBlurCapture,
    onKCSFocus
  };
}
