import { getLegalMoves, getPlayableMask } from "@vcell/engine";
import type { Card as EngineCard } from "@vcell/engine";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useGame } from "@/state/game/GameProvider";
import Card from "../Card";
import "./board.css";
import { useCardDrag } from "@/ui/useCardDrag";
import Tableau from "./Tableau";
import Foundations from "./Foundations";
import FreeCells from "./FreeCells";
import { useBoardDrop } from "./useBoardDrop";
import { useAutoFoundation } from "./useAutoFoundation";

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

type BoardStateShape = {
  foundations: Array<{ cards: EngineCard[] }>;
  freeCells: Array<EngineCard | null>;
};

function buildFoundationsRow(
  state: BoardStateShape
): Array<EngineCard | null | undefined> {
  const top = (i: number) => {
    const slot = state.foundations[i];
    return slot.cards.length ? slot.cards[slot.cards.length - 1] : null;
  };

  // `undefined` = padding (renders no slot), `null` = empty slot (renders a slot)
  return [
    undefined,
    undefined,
    undefined,
    top(0) ?? null,
    top(1) ?? null,
    top(2) ?? null,
    top(3) ?? null
  ];
}

function buildFreeCellsRow(
  state: BoardStateShape
): Array<EngineCard | null | undefined> {
  return [
    undefined,
    state.freeCells[0] ?? null,
    state.freeCells[1] ?? null,
    state.freeCells[2] ?? null,
    state.freeCells[3] ?? null,
    state.freeCells[4] ?? null,
    undefined
  ];
}

function Board() {
  const {
    state,
    isWon,
    showTimer,
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

  const tableauColRefs = useRef<Array<HTMLDivElement | null>>([]);
  const setTableauColRef = useCallback(
    (colIndex: number, el: HTMLDivElement | null) => {
      tableauColRefs.current[colIndex] = el;
    },
    []
  );

  const freeCellRefs = useRef<Array<HTMLDivElement | null>>([]);
  const setFreeCellRef = useCallback(
    (index: number, el: HTMLDivElement | null) => {
      freeCellRefs.current[index] = el;
    },
    []
  );

  const foundationRefs = useRef<Array<HTMLDivElement | null>>([]);
  const setFoundationRef = useCallback(
    (index: number, el: HTMLDivElement | null) => {
      foundationRefs.current[index] = el;
    },
    []
  );

  const {
    drag,
    finalizeDrag,
    handleTableauPointerDown,
    handleFreeCellPointerDown,
    handleFoundationPointerDown
  } = useCardDrag(state, playable, {
    getTableauCols: () => tableauColRefs.current,
    getFreeCells: () => freeCellRefs.current,
    getFoundations: () => foundationRefs.current,
    onDrop
  });

  const foundationsRow = buildFoundationsRow(state);
  const freeCellsRow = buildFreeCellsRow(state);

  return (
    <>
      <WinAlertEffect isWon={isWon} />
      <div className="board-border" key={state.seed}>
        <div className="board" aria-label="Game board">
          {/* Foundations on top */}
          <Foundations
            foundationsRow={foundationsRow}
            foundations={state.foundations}
            drag={drag}
            playableFoundations={playable.foundations}
            showTimer={showTimer}
            setFoundationRef={setFoundationRef}
            handleFoundationPointerDown={handleFoundationPointerDown}
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
      </div>

      <section className="control" aria-label="Game actions">
        <h2
          style={{
            textAlign: "center"
          }}
        >
          Seed: {state?.seed ?? "(unknown)"}
        </h2>
        <br />
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
      </section>
    </>
  );
}

export default Board;
