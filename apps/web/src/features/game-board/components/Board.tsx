import { useCallback, useEffect, useRef } from "react";
import { BoardKbAttrsContext } from "@/features/game-board/keyboard/boardKbAttrs";
import { useBoardKeyboardSystem } from "@/features/game-board/keyboard/useBoardKeyboardSystem";
import { useGame } from "@/state/game/GameProvider";
import "../styles/board.css";
import { useCardDrag } from "@/features/game-board/animations/useCardDrag";
import { useBoardFlipAnimation } from "@/features/game-board/animations/useBoardFlipAnimation";
import { useBoardDerived } from "@/features/game-board/hooks/useBoardDerived";
import { useFlipSequencer } from "@/features/game-board/animations/useFlipSequencer";
import { useNoFlipResets } from "@/features/game-board/hooks/useNoFlipResets";
import Tableau from "./Tableau";
import Foundations from "./Foundations";
import FreeCells from "./FreeCells";
import { useBoardDomRegistry } from "../dom/boardDomRegistry";
import { useBoardDrop } from "../hooks/useBoardDrop";
import { useAutoFoundation } from "../hooks/useAutoFoundation";
import { useAutoFreeCell } from "../hooks/useAutoFreeCell";
import { useBoardDomMapping } from "../hooks/useBoardDomMapping";
import { buildFoundationsRow, buildFreeCellsRow } from "../dom/boardRows";
import BoardModals from "./BoardModals";
import { useBoardAutoComplete } from "@/features/game-board/hooks/useBoardAutoComplete";
import { useBoardMovePolicy } from "@/features/game-board/hooks/useBoardMovePolicy";
import { useWinState } from "@/features/game-board/hooks/useWinState";
import DragLayer from "./DragLayer";
import BoardControls from "./BoardControls";

function Board() {
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
  } = useGame();

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

  const tryAutoFoundationFromEl = useCallback(
    (el: HTMLElement) => {
      const from = buildPileRefFromEl(el);
      if (!from) return false;
      return tryAutoFoundation(from);
    },
    [buildPileRefFromEl, tryAutoFoundation]
  );

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
    drag: { active: drag.active, pending: drag.pending },
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
    restart: restartWithCelebration
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

  return (
    <>
      <div
        className={`board-border ${kbCarrying ? "is-kb-carrying" : ""}`}
        key={seedReady ? state.seed : "loading"}
      >
        <BoardKbAttrsContext.Provider value={kbAttrsContextValue}>
          <div
            className="board"
            aria-label="Game board"
            ref={boardRef}
            tabIndex={isInputSuppressed ? -1 : 0}
            onKeyDown={(e) => {
              if (isInputSuppressed) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              onBoardKeyDown(e);
            }}
            onPointerDownCapture={onBoardPointerDownCapture}
            onFocusCapture={onBoardFocusCapture}
            onBlurCapture={onBoardBlurCapture}
            onFocus={onBoardFocus}
          >
            {seedReady ? (
              <>
                {/* Foundations on top */}
                <Foundations
                  hasStarted={hasStarted}
                  timeElapsedMs={timeElapsedMs}
                  foundationsRow={foundationsRow}
                  foundations={state.foundations}
                  drag={drag}
                  playableFoundations={playable.foundations}
                  allowFoundationPullback={allowFoundationPullback}
                  showTimer={showTimer}
                  setFoundationRef={setFoundationRef}
                  handleFoundationPointerDown={handleFoundationPointerDown}
                  onPause={() => setPaused(true)}
                  isWon={isWon}
                  isAbandoned={false}
                />

                {/* Tableau in the middle */}
                <Tableau
                  state={state}
                  playable={playable}
                  drag={drag}
                  handleTableauPointerDown={handleTableauPointerDown}
                  tryAutoFoundation={tryAutoFoundation}
                  setTableauColRef={setTableauColRef}
                  isWon={isWon}
                />

                {/* Drag overlay layer */}
                <DragLayer drag={drag} finalizeDrag={finalizeDrag} />

                {/* Free cells on bottom */}
                <FreeCells
                  freeCellsRow={freeCellsRow}
                  playableFreeCells={playable.freeCells}
                  tryAutoFoundation={tryAutoFoundation}
                  setFreeCellRef={setFreeCellRef}
                  drag={drag}
                  handleFreeCellPointerDown={handleFreeCellPointerDown}
                  showAcp={showAcp}
                  isAutoCompleting={isAutoCompleting}
                  runAutoComplete={runAutoComplete}
                  stopAutoComplete={stopAutoComplete}
                  seedReady={seedReady}
                  paused={paused}
                  shouldShowWinModal={shouldShowWinModal}
                />
              </>
            ) : (
              <div className="board-loading" aria-label="Loading deal" />
            )}
          </div>
          <BoardModals
            paused={paused}
            onResume={() => setPaused(false)}
            shouldShowWinModal={shouldShowWinModal}
            onDismissWinModal={dismissWinModal}
            moveCount={moveCount}
            timeElapsedMs={timeElapsedMs}
            onNewDeal={newDealWithCelebration}
          />
        </BoardKbAttrsContext.Provider>
      </div>

      <BoardControls
        seed={state?.seed ?? "(unknown)"}
        onNewDeal={newDealWithCelebration}
        onRestart={restartWithCelebration}
        onUndo={undo}
        canUndo={canUndo}
        undoLimit={undoLimit}
        undosRemaining={undosRemaining}
      />
    </>
  );
}

export default Board;
