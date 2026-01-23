import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getLegalMoves, getPlayableMask } from "@vcell/engine";
import JSConfetti from "js-confetti";
import { useGame } from "@/state/game/GameProvider";
import Card from "./Card";
import "../styles/board.css";
import { useCardDrag } from "@/features/game-board/animations/useCardDrag";
import { useBoardFlipAnimation } from "@/features/game-board/animations/useBoardFlipAnimation";
import Tableau from "./Tableau";
import Foundations from "./Foundations";
import FreeCells from "./FreeCells";
import { useBoardDomRegistry } from "../dom/boardDomRegistry";
import { useBoardDrop } from "../hooks/useBoardDrop";
import { useAutoFoundation } from "../hooks/useAutoFoundation";
import { useAutoFreeCell } from "../hooks/useAutoFreeCell";
import { useBoardKeyboardNav } from "../hooks/useBoardKeyboardNav";
import { useBoardKeyboardController } from "../hooks/useBoardKeyboardController";
import { useBoardDomMapping } from "../hooks/useBoardDomMapping";
import { buildFoundationsRow, buildFreeCellsRow } from "../dom/boardRows";
import ModalOverlay from "@/components/ModalOverlay";

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
    seedReady,
    timeElapsedMs,
    hasStarted,
    moveCount
  } = useGame();

  const playable = useMemo(() => getPlayableMask(state), [state]);

  const legalMoves = useMemo(() => getLegalMoves(state), [state]);

  const onDrop = useBoardDrop({ legalMoves, dispatchMove });

  const tryAutoFoundation = useAutoFoundation({ legalMoves, dispatchMove });
  const tryAutoFreeCell = useAutoFreeCell({ legalMoves, dispatchMove });

  const [showAcp, setShowAcp] = useState(false);
  // Tracks which deal's win modal has been dismissed.
  // When the seed changes (new deal), the modal can appear again.
  const [dismissedWinSeed, setDismissedWinSeed] = useState<string | null>(null);
  const [devForceWinModal, setDevForceWinModal] = useState(false);

  const shouldShowWinModal = isWon
    ? dismissedWinSeed !== state.seed
    : devForceWinModal;

  const isAnyModalOpen = paused || shouldShowWinModal;

  const wasWinModalOpenRef = useRef(false);

  useEffect(() => {
    const isOpen = shouldShowWinModal;
    const wasOpen = wasWinModalOpenRef.current;

    if (isOpen && !wasOpen) {
      throwConfetti();
    }

    wasWinModalOpenRef.current = isOpen;
  }, [shouldShowWinModal]);

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
    getNodeMeta
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

  const tryAutoFreeCellFromEl = useCallback(
    (el: HTMLElement) => {
      const from = buildPileRefFromEl(el);
      if (!from) return false;
      return tryAutoFreeCell(from);
    },
    [buildPileRefFromEl, tryAutoFreeCell]
  );

  const prevCardRectsRef = useRef<Map<string, DOMRect>>(new Map());
  // If a pointer drag just committed a move, skip FLIP for the next render.
  const suppressFlipOnceRef = useRef(false);

  const newDealNoFlip = useCallback(() => {
    // New deal should not animate card movement.
    suppressFlipOnceRef.current = true;
    prevCardRectsRef.current = new Map();
    setDismissedWinSeed(null);
    setDevForceWinModal(false);
    newDeal();
  }, [newDeal, setDismissedWinSeed, setDevForceWinModal]);

  const restartNoFlip = useCallback(() => {
    // Restarting should not animate card movement.
    suppressFlipOnceRef.current = true;
    prevCardRectsRef.current = new Map();
    setDismissedWinSeed(null);
    setDevForceWinModal(false);
    restart();
  }, [restart, setDismissedWinSeed, setDevForceWinModal]);

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
    onDrop: (...args: Parameters<typeof onDrop>) => {
      const didCommit = onDrop(...args);
      if (didCommit) suppressFlipOnceRef.current = true;
      return didCommit;
    }
  });

  const foundationsRow = buildFoundationsRow(state);
  const freeCellsRow = buildFreeCellsRow(state);

  const [kbCarrying, setKbCarrying] = useState(false);

  const {
    boardRef,
    focusablesRef,
    setActiveFocusIndex,
    hadBoardFocusRef,
    lastFocusPointRef,
    getCenter,
    findNextByDirection,
    onBoardFocusCapture,
    focusFirstPlayable,
    focusElIfFocusable
  } = useBoardKeyboardNav({
    state,
    playable,
    kbCarrying,
    getNodeMeta
  });

  const {
    onBoardKeyDown,
    clearKbCarryVisuals,
    kbCarriedElRef,
    setKeyboardDropTarget
  } = useBoardKeyboardController({
    boardRef,
    kbCarrying,
    setKbCarrying,
    legalMoves,
    dispatchMove,
    undo,
    canUndo,
    newDeal: newDealNoFlip,
    restart: restartNoFlip,
    paused,
    setPaused,
    tryAutoFoundationFromEl,
    tryAutoFreeCellFromEl,
    findNextByDirection,
    buildKbDragFromEl,
    buildKbDropTargetFromEl,
    isAnyModalOpen
  });

  // --- FLIP animation for instant (non-drag) moves ---
  useBoardFlipAnimation({
    boardRef,
    state,
    seedReady,
    kbCarrying,
    drag,
    getNodeMeta,
    suppressFlipOnceRef,
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
      <button
        type="button"
        className="btn btn--secondary"
        onClick={() => setDevForceWinModal(true)}
      >
        Dev: Show win modal
      </button>

      <div
        className={`board-border ${kbCarrying ? "is-kb-carrying" : ""}`}
        key={seedReady ? state.seed : "loading"}
      >
        <div
          className="board"
          aria-label="Game board"
          ref={boardRef}
          tabIndex={isAnyModalOpen ? -1 : 0}
          onKeyDown={(e) => {
            if (isAnyModalOpen) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            onBoardKeyDown(e);
          }}
          onPointerDownCapture={(e) => {
            if (isAnyModalOpen) return;
            const root = boardRef.current;
            if (!root) return;

            const target = e.target as HTMLElement | null;
            if (!target) {
              focusFirstPlayable();
              return;
            }

            // Prefer focusing the nearest element that could be in the focusables list.
            const candidate =
              (target.closest(
                "[tabindex], .card, .freecell, .foundation, .tableau-col, .tableau-empty"
              ) as HTMLElement | null) || target;

            const focused = focusElIfFocusable(candidate);
            if (!focused) {
              // Clicking in empty space should still "enter" keyboard mode.
              focusFirstPlayable();
            }
          }}
          onFocusCapture={() => {
            if (isAnyModalOpen) return;
            hadBoardFocusRef.current = true;
            onBoardFocusCapture();
          }}
          onBlurCapture={(e) => {
            const root = boardRef.current;
            // If focus is leaving the board entirely, clear the flag.
            if (root && !root.contains(e.relatedTarget as Node | null)) {
              hadBoardFocusRef.current = false;
              setKbCarrying(false);
              clearKbCarryVisuals();
            }
          }}
          onFocus={(e) => {
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
          }}
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
                        disableInternalDrag
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
            onClose={() => {
              if (isWon) setDismissedWinSeed(state.seed);
              setDevForceWinModal(false);
            }}
            bodyText={`Moves: ${moveCount} • Time: ${formatElapsed(timeElapsedMs)}`}
            primaryButtonLabel="New Deal"
            primaryButtonAction={newDealNoFlip}
            secondaryButtonLabel="Close"
          />
        )}
      </div>

      <section className="control" aria-label="Game actions">
        <div className="row">
          <button
            type="button"
            className="btn btn--primary"
            onClick={newDealNoFlip}
          >
            New deal
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={restartNoFlip}
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
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setShowAcp(!showAcp)}
          >
            toggle acp
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
