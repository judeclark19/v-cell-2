import { applyMove, getLegalMoves, getPlayableMask } from "@vcell/engine";
import type { Card as EngineCard, PileRef } from "@vcell/engine";
import { useCallback, useMemo, useRef } from "react";
import { useGame } from "@/state/game/GameProvider";
import Card from "../Card";
import "./board.css";
import { useTableauDrag } from "@/ui/useTableauDrag";
import Tableau from "./Tableau";
import Foundations from "./Foundations";
import FreeCells from "./FreeCells";

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
  const { state, showTimer, dispatchMove, undo, canUndo } = useGame();
  const playable = useMemo(() => getPlayableMask(state), [state]);

  type Move = Parameters<typeof applyMove>[1];
  type TableauIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

  const legalMoves = useMemo(() => getLegalMoves(state), [state]);

  const tableauColRefs = useRef<Array<HTMLDivElement | null>>([]);
  const setTableauColRef = useCallback(
    (colIndex: number, el: HTMLDivElement | null) => {
      tableauColRefs.current[colIndex] = el;
    },
    []
  );

  const { drag, handleTableauPointerDown } = useTableauDrag(state, playable, {
    getTableauCols: () => tableauColRefs.current,
    onDrop: ({ drag, dropTarget }) => {
      // Single-card tableau → tableau drops only for now.
      if (drag.stack.length !== 1) return;
      if (!drag.source || drag.source.type !== "tableau") return;
      if (!dropTarget || dropTarget.type !== "tableau") return;
      if (dropTarget.colIndex === drag.source.colIndex) return;

      const fromIndex = drag.source.colIndex as TableauIndex;
      const toIndex = dropTarget.colIndex as TableauIndex;

      const move = legalMoves.find(
        (m): m is Extract<Move, { kind: "single" }> =>
          m.kind === "single" &&
          m.from.type === "tableau" &&
          m.to.type === "tableau" &&
          m.from.index === fromIndex &&
          m.to.index === toIndex
      );

      if (move) dispatchMove(move);
    }
  });

  const tryAutoFoundation = useCallback(
    (from: PileRef) => {
      const candidates = legalMoves.filter(
        (m): m is Extract<Move, { kind: "single" }> => {
          if (m.kind !== "single") return false;
          if (m.from.type !== from.type) return false;
          if (m.to.type !== "foundation") return false;

          const mFromIndex = (m.from as { index?: number }).index;
          const fromIndex = (from as { index?: number }).index;
          return mFromIndex === fromIndex;
        }
      );

      if (candidates.length === 0) return;

      // Choose deterministically: lowest foundation index.
      candidates.sort((a, b) => a.to.index - b.to.index);
      dispatchMove(candidates[0]);
    },
    [dispatchMove, legalMoves]
  );

  const foundationsRow = buildFoundationsRow(state);
  const freeCellsRow = buildFreeCellsRow(state);

  return (
    <>
      <div className="board-border">
        <div className="board" aria-label="Game board">
          {/* Foundations on top */}
          <Foundations
            foundationsRow={foundationsRow}
            playableFoundations={playable.foundations}
            showTimer={showTimer}
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
          {drag.active && drag.stack.length > 0 && (
            <div
              className="drag-layer"
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
          />
        </div>
      </div>

      <section className="control" aria-label="Game actions">
        <div className="row">
          <button type="button" className="btn btn--primary" disabled>
            New deal
          </button>
          <button type="button" className="btn btn--secondary" disabled>
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
