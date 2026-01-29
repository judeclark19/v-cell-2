import { useCallback, useEffect, useMemo, useRef } from "react";
import { BoardKbAttrsContext } from "@/features/game-board/keyboard/boardKbAttrs";
import { useBoardKeyboardSystem } from "@/features/game-board/keyboard/useBoardKeyboardSystem";
import { getLegalMoves, getPlayableMask } from "@vcell/engine";
import JSConfetti from "js-confetti";
import { useGame } from "@/state/game/GameProvider";
import Card from "./Card";
import "../styles/board.css";
import { useCardDrag } from "@/features/game-board/animations/useCardDrag";
import { useBoardFlipAnimation } from "@/features/game-board/animations/useBoardFlipAnimation";
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
import ModalOverlay from "@/components/ModalOverlay";
import { useBoardAutoComplete } from "@/features/game-board/hooks/useBoardAutoComplete";
import { useBoardMovePolicy } from "@/features/game-board/hooks/useBoardMovePolicy";
import { useWinState } from "@/features/game-board/hooks/useWinState";

function formatElapsed(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function throwConfetti() {
  const confetti = new JSConfetti();

  const cardEl = document.querySelector<HTMLElement>(".card");
  const cardWidth = cardEl?.getBoundingClientRect().width;

  // Derive emoji size from card width (fallback to 24)
  const rawEmojiSize = cardWidth ? cardWidth * 0.3 : 24;

  // Clamp to a sensible range
  const emojiSize = Math.max(16, Math.min(40, Math.round(rawEmojiSize)));

  // custom confetti
  confetti.addConfetti({
    emojis: ["🎰", "🃏", "❤️", "♠️", "♣️", "♦️"],
    emojiSize,
    confettiNumber: 200
  });

  // plus standard confetti
  confetti.addConfetti({
    confettiNumber: 200
  });
}

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

  const playable = useMemo(() => getPlayableMask(state), [state]);

  const legalMoves = useMemo(() => getLegalMoves(state), [state]);

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

  const foundationCount = useMemo(() => {
    return state.foundations.reduce((sum, pile) => sum + pile.cards.length, 0);
  }, [state.foundations]);

  const isFullyCollected = foundationCount === 52;

  const showAcp = isWon && !isFullyCollected;

  const {
    shouldShowWinModal,
    isAnyModalOpen,
    dismissWinModal,
    clearCelebration,
    clearDismissal
  } = useWinState({
    seed: state.seed,
    // win modal/confetti are tied to full collection, not your isWon condition
    isWon: isFullyCollected,
    isAnyModalOpenBase: paused,
    fireConfetti: throwConfetti
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
      <button
        type="button"
        className="btn btn--secondary"
        onClick={throwConfetti}
      >
        Throw Confetti
      </button>

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
                {(drag.active || drag.pending) && drag.stack.length > 0 && (
                  <div
                    className={`drag-layer ${
                      drag.isReturning ? "is-returning" : ""
                    }`}
                    onTransitionEnd={() => {
                      if (drag.isReturning) finalizeDrag();
                    }}
                    style={{
                      left: 0,
                      top: 0,
                      transform: `translate3d(${drag.baseLeft + drag.x}px, ${
                        drag.baseTop + drag.y
                      }px, 0)`
                    }}
                    aria-hidden="true"
                  >
                    <div className="drag-layer__stack tableau-col">
                      {drag.stack.map((tc, i) => (
                        <Card
                          key={tc.card.id}
                          card={tc.card}
                          faceDown={tc.faceDown}
                          playable
                          // Ensure the stack keeps its normal spacing
                          style={{ zIndex: i + 1 }}
                        />
                      ))}
                    </div>
                  </div>
                )}

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
          {paused && (
            <ModalOverlay
              overlayAriaLabel="Game paused"
              title="Paused"
              buttonAriaLabel="Resume game"
              onClose={() => setPaused(false)}
              bodyText="Timer is paused. Gameplay is disabled until you resume."
              primaryButtonLabel="Resume"
            />
          )}
          {shouldShowWinModal && (
            <ModalOverlay
              overlayAriaLabel="Game won"
              title="You won!"
              buttonAriaLabel="Close win dialog"
              onClose={dismissWinModal}
              bodyText={`Moves: ${moveCount} • Time: ${formatElapsed(timeElapsedMs)}`}
              primaryButtonLabel="New Deal"
              primaryButtonAction={newDealWithCelebration}
              secondaryButtonLabel="Close"
            />
          )}
        </BoardKbAttrsContext.Provider>
      </div>

      <section className="control" aria-label="Game actions">
        <div className="row">
          <button
            type="button"
            className="btn btn--primary"
            onClick={newDealWithCelebration}
          >
            New deal
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={restartWithCelebration}
          >
            Restart deal
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={undo}
            disabled={!canUndo}
          >
            {undoLimit === "unlimited" || undoLimit === 0
              ? "Undo"
              : `Undo (${undosRemaining})`}
          </button>
        </div>

        <p className="hint" style={{ textAlign: "center" }}>
          Seed: {state?.seed ?? "(unknown)"}
        </p>
      </section>
    </>
  );
}

export default Board;
