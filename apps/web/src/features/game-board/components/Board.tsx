import { getLegalMoves, getPlayableMask } from "@vcell/engine";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "@/state/game/GameProvider";
import Card from "./Card";
import "../styles/board.css";
import { useCardDrag } from "@/ui/useCardDrag";
import Tableau from "./Tableau";
import Foundations from "./Foundations";
import FreeCells from "./FreeCells";
import PauseOverlay from "./PauseOverlay";
import { useBoardDomRegistry } from "../dom/boardDomRegistry";
import { useBoardDrop } from "../hooks/useBoardDrop";
import { useAutoFoundation } from "../hooks/useAutoFoundation";
import { useAutoFreeCell } from "../hooks/useAutoFreeCell";
import { useBoardKeyboardNav } from "../hooks/useBoardKeyboardNav";
import { useBoardKeyboardController } from "../hooks/useBoardKeyboardController";
import { useBoardDomMapping } from "../hooks/useBoardDomMapping";
import { buildFoundationsRow, buildFreeCellsRow } from "../dom/boardRows";

function WinAlertEffect({ isWon }: { isWon: boolean }) {
  const hasAlertedWinRef = useRef(false);

  useEffect(() => {
    if (isWon) {
      if (!hasAlertedWinRef.current) {
        hasAlertedWinRef.current = true;
        window.alert("You won!");
      }
    } else {
      // Reset between deals / restarts.
      hasAlertedWinRef.current = false;
    }
  }, [isWon]);

  return null;
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
    newDeal,
    restart
  } = useGame();

  const playable = useMemo(() => getPlayableMask(state), [state]);

  const legalMoves = useMemo(() => getLegalMoves(state), [state]);

  const onDrop = useBoardDrop({ legalMoves, dispatchMove });
  const tryAutoFoundation = useAutoFoundation({ legalMoves, dispatchMove });
  const tryAutoFreeCell = useAutoFreeCell({ legalMoves, dispatchMove });

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
    onDrop
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
    onBoardFocusCapture
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
    newDeal,
    restart,
    tryAutoFoundationFromEl,
    tryAutoFreeCellFromEl,
    findNextByDirection,
    buildKbDragFromEl,
    buildKbDropTargetFromEl
  });

  return (
    <>
      <WinAlertEffect isWon={isWon} />
      <div
        className={`board-border ${kbCarrying ? "is-kb-carrying" : ""}`}
        key={state.seed}
      >
        <div
          className="board"
          aria-label="Game board"
          ref={boardRef}
          onKeyDown={onBoardKeyDown}
          onFocusCapture={() => {
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
          {/* Foundations on top */}
          <Foundations
            foundationsRow={foundationsRow}
            foundations={state.foundations}
            drag={drag}
            playableFoundations={playable.foundations}
            allowFoundationPullback={allowFoundationPullback}
            showTimer={showTimer}
            setFoundationRef={setFoundationRef}
            handleFoundationPointerDown={handleFoundationPointerDown}
            onPause={() => setPaused(true)}
          />

          {/* Tableau in the middle */}
          <Tableau
            state={state}
            playable={playable}
            drag={drag}
            handleTableauPointerDown={handleTableauPointerDown}
            tryAutoFoundation={tryAutoFoundation}
            setTableauColRef={setTableauColRef}
          />

          {/* Drag overlay layer */}
          {(drag.active || drag.pending) && drag.stack.length > 0 && (
            <div
              className={`drag-layer ${drag.isReturning ? "is-returning" : ""}`}
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
          />
        </div>
        {paused && <PauseOverlay onClose={() => setPaused(false)} />}
      </div>

      <section className="control" aria-label="Game actions">
        <div className="row">
          <button type="button" className="btn btn--primary" onClick={newDeal}>
            New deal
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={restart}
          >
            Restart deal
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={undo}
            disabled={!canUndo}
          >
            Undo
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
