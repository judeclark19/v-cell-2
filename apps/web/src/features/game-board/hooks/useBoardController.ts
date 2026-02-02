import { useCallback, useEffect, useRef } from "react";

import { useCardDrag } from "@/features/game-board/animations/useCardDrag";
import { useBoardFlipAnimation } from "@/features/game-board/animations/useBoardFlipAnimation";
import { useFlipSequencer } from "@/features/game-board/animations/useFlipSequencer";
import { useBoardDomRegistry } from "@/features/game-board/dom/boardDomRegistry";
import {
  buildFoundationsRow,
  buildFreeCellsRow
} from "@/features/game-board/dom/boardRows";
import { useBoardKeyboardSystem } from "@/features/game-board/keyboard/useBoardKeyboardSystem";
import { useAutoFoundation } from "@/features/game-board/hooks/useAutoFoundation";
import { useAutoFreeCell } from "@/features/game-board/hooks/useAutoFreeCell";
import { useBoardAutoComplete } from "@/features/game-board/hooks/useBoardAutoComplete";
import { useBoardDerived } from "@/features/game-board/hooks/useBoardDerived";
import { useBoardDomMapping } from "@/features/game-board/hooks/useBoardDomMapping";
import { useBoardDrop } from "@/features/game-board/hooks/useBoardDrop";
import { useBoardMovePolicy } from "@/features/game-board/hooks/useBoardMovePolicy";
import { useNoFlipResets } from "@/features/game-board/hooks/useNoFlipResets";
import { useWinState } from "@/features/game-board/hooks/useWinState";
import { useGame } from "@/state/game/GameProvider";

export type UseBoardControllerParams = ReturnType<typeof useGame>;

export function useBoardController(params: UseBoardControllerParams) {
  const {
    state,
    isWon,
    showTimer,
    paused,
    setPaused,
    allowFoundationPullback,
    dispatchMove,
    undo,
    canUndo,
    undoLimit,
    undosRemaining,
    newDeal,
    restart,
    replaySeed,
    seedReady,
    timeElapsedMs,
    hasStarted,
    moveCount
  } = params;

  const { playable, legalMoves, isFullyCollected } = useBoardDerived(state);

  const onDrop = useBoardDrop({ legalMoves, dispatchMove });

  const commitMoveFromPointerDropRef = useRef<
    ((...args: Parameters<typeof onDrop>) => boolean) | null
  >(null);

  const commitMoveFromPointerDropProxy = useCallback(
    (...args: Parameters<typeof onDrop>) => {
      return commitMoveFromPointerDropRef.current?.(...args) ?? false;
    },
    []
  );

  const tryAutoFoundation = useAutoFoundation({ legalMoves, dispatchMove });
  const tryAutoFreeCell = useAutoFreeCell({ legalMoves, dispatchMove });

  const {
    shouldShowWinModal,
    isAnyModalOpen,
    dismissWinModal,
    clearCelebration,
    clearDismissal,
    showAcp
  } = useWinState({
    seed: state.seed,
    isWon,
    isFullyCollected,
    isAnyModalOpenBase: paused
  });

  const {
    tableauColRefs,
    setTableauColRef,
    freeCellRefs,
    setFreeCellRef,
    foundationRefs,
    setFoundationRef
  } = useBoardDomRegistry();

  const {
    buildPileRefFromEl,
    buildKbDragFromEl,
    buildKbDropTargetFromEl,
    getNodeMeta,
    getKbAttrsForEl
  } = useBoardDomMapping({
    tableauColRefs,
    freeCellRefs,
    foundationRefs,
    tableau: state.tableau,
    freeCells: state.freeCells,
    foundations: state.foundations
  });

  const { waitForFlipComplete, onFlipComplete } = useFlipSequencer();

  const tryAutoFreeCellFromEl = useCallback(
    (el: HTMLElement) => {
      const from = buildPileRefFromEl(el);
      if (!from) return false;
      return tryAutoFreeCell(from);
    },
    [buildPileRefFromEl, tryAutoFreeCell]
  );

  const {
    drag,
    finalizeDrag,
    startKbFlight,
    handleTableauPointerDown,
    handleFreeCellPointerDown,
    handleFoundationPointerDown
  } = useCardDrag(state, playable, {
    allowFoundationPullback,
    getTableauCols: () => tableauColRefs.current,
    getFreeCells: () => freeCellRefs.current,
    getFoundations: () => foundationRefs.current,
    onDrop: commitMoveFromPointerDropProxy
  });

  // Keyboard "flight" animation entrypoint. We will thread this into the keyboard system next.
  const startKbFlightFromKeyboard = useCallback(
    (args: Parameters<typeof startKbFlight>[0]) => {
      startKbFlight(args);
    },
    [startKbFlight]
  );

  const getFoundationDropEl = useCallback(
    (index: number) => foundationRefs.current[index] ?? null,
    [foundationRefs]
  );

  /**
   * Element-based auto-foundation with flight animation.
   * Used by double-click / activation flows and by keyboard system.
   */
  const tryAutoFoundationFromEl = useCallback(
    (el: HTMLElement) => {
      const from = buildPileRefFromEl(el);
      if (!from) return false;

      // Deterministic single move from this pile to a foundation.
      const match = legalMoves.find(
        (m) =>
          m.kind === "single" &&
          m.from.type === from.type &&
          m.from.index === from.index &&
          m.to.type === "foundation"
      );

      if (!match) {
        // Fall back to existing behavior (still moves, just no flight).
        return tryAutoFoundation(from);
      }

      const toIndex = match.to.index;
      const toEl = getFoundationDropEl(toIndex);
      const kbDrag = buildKbDragFromEl(el);

      if (toEl && kbDrag?.source) {
        startKbFlightFromKeyboard({
          fromEl: el,
          toEl,
          stack: kbDrag.stack,
          source: kbDrag.source,
          dropTarget: { type: "foundation", index: toIndex }
        });

        dispatchMove(match);
        return true;
      }

      // Commit the move.
      dispatchMove(match);
      return true;
    },
    [
      buildPileRefFromEl,
      legalMoves,
      getFoundationDropEl,
      buildKbDragFromEl,
      startKbFlightFromKeyboard,
      dispatchMove,
      tryAutoFoundation
    ]
  );

  const {
    isAutoCompleting,
    runAutoComplete,
    stopAutoComplete,
    stopAutoCompleteRef
  } = useBoardAutoComplete({
    seedReady,
    paused,
    isAnyModalOpen,
    shouldShowWinModal,
    drag: {
      pointerId: drag.pointerId,
      pending: drag.pending,
      kbFlight: drag.kbFlight
    },
    freeCellRefs,
    tableauColRefs,
    tryAutoFoundationFromEl,
    waitForFlipComplete
  });

  const {
    prevCardRectsRef,
    consumeSuppressFlipOnce,
    suppressFlipOnceNext,
    newDealNoFlip,
    restartNoFlip
  } = useNoFlipResets({
    newDeal,
    restart,
    stopAutoCompleteRef,
    clearDismissedWinSeed: clearDismissal
  });

  const {
    commitMoveFromKeyboard,
    commitMoveFromPointerDrop,
    newDealWithCelebration,
    restartWithCelebration
  } = useBoardMovePolicy({
    onDrop,
    dispatchMove,
    suppressFlipOnceNext,
    clearCelebration,
    newDealNoFlip,
    restartNoFlip,
    isWon,
    seed: state.seed,
    replaceSeed: replaySeed
  });

  const isInputSuppressed = isAnyModalOpen || isAutoCompleting;

  const isLegalDropTargetEl = useCallback((el: HTMLElement) => {
    return el.getAttribute("data-kb-drop-target") === "true";
  }, []);

  const getFreeCellDropEl = useCallback(
    (index: number) => freeCellRefs.current[index] ?? null,
    [freeCellRefs]
  );

  const {
    boardRef,
    kbAttrsContextValue,
    onBoardKeyDown,
    onBoardFocusCapture,
    onBoardBlurCapture,
    onBoardFocus,
    onBoardPointerDownCapture,
    kbCarrying
  } = useBoardKeyboardSystem({
    isInputSuppressed,

    state,
    playable,
    legalMoves,

    getNodeMeta,
    getKbAttrsForElCore: getKbAttrsForEl,
    isLegalDropTargetEl,

    buildKbDragFromEl,
    buildKbDropTargetFromEl,
    tryAutoFoundationFromEl,
    tryAutoFreeCellFromEl,

    dispatchMove: commitMoveFromKeyboard,
    undo,
    canUndo,
    paused,
    setPaused,

    newDeal: newDealWithCelebration,
    restart: restartWithCelebration,
    startKbFlight: ({ fromEl, toEl, kbDrag, dropTarget }) => {
      startKbFlightFromKeyboard({
        fromEl,
        toEl,
        stack: kbDrag.stack,
        source: kbDrag.source,
        dropTarget
      });
    },
    getFoundationDropEl,
    getFreeCellDropEl
  });

  useEffect(() => {
    commitMoveFromPointerDropRef.current = commitMoveFromPointerDrop;
  }, [commitMoveFromPointerDrop]);

  const foundationsRow = buildFoundationsRow(state);
  const freeCellsRow = buildFreeCellsRow(state);

  // --- FLIP animation for instant (non-drag) moves ---
  useBoardFlipAnimation({
    boardRef,
    state,
    seedReady,
    kbCarrying,
    drag,
    getNodeMeta,
    consumeSuppressFlipOnce,
    onFlipComplete,
    prevCardRectsRef
  });
  // --- end FLIP animation ---

  return {
    // from useGame
    state,
    isWon,
    showTimer,
    paused,
    setPaused,
    allowFoundationPullback,
    undo,
    canUndo,
    undoLimit,
    undosRemaining,
    seedReady,
    timeElapsedMs,
    hasStarted,
    moveCount,
    // derived/wiring
    playable,
    legalMoves,
    foundationsRow,
    freeCellsRow,
    tryAutoFoundationFromEl,
    tryAutoFreeCellFromEl,
    drag,
    finalizeDrag,
    handleTableauPointerDown,
    handleFreeCellPointerDown,
    handleFoundationPointerDown,
    setTableauColRef,
    setFreeCellRef,
    setFoundationRef,
    // autocomplete/win state
    shouldShowWinModal,
    isAnyModalOpen,
    dismissWinModal,
    showAcp,
    isAutoCompleting,
    runAutoComplete,
    stopAutoComplete,
    // move policy actions
    newDealWithCelebration,
    restartWithCelebration,
    // keyboard plumbing
    isInputSuppressed,
    boardRef,
    kbAttrsContextValue,
    onBoardKeyDown,
    onBoardFocusCapture,
    onBoardBlurCapture,
    onBoardFocus,
    onBoardPointerDownCapture,
    kbCarrying
  };
}
