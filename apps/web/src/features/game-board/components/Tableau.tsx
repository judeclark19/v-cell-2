import type { Card as EngineCard, PileRef, TableauIndex } from "@vcell/engine";
import { useContext } from "react";
import Card from "./Card";
import { BoardKbAttrsContext } from "./Board";
import type { useCardDrag } from "@/features/game-board/animations/useCardDrag";

type TableauProps = {
  state: {
    tableau: Array<Array<{ card: EngineCard; faceDown: boolean }>>;
  };
  playable: {
    tableau: Array<Array<boolean>>;
  };
  drag: ReturnType<typeof useCardDrag>["drag"];
  handleTableauPointerDown: ReturnType<
    typeof useCardDrag
  >["handleTableauPointerDown"];
  tryAutoFoundation: (from: PileRef) => void;
  setTableauColRef: (colIndex: number, el: HTMLDivElement | null) => void;
  isWon: boolean;
};

function Tableau({
  state,
  playable,
  drag,
  handleTableauPointerDown,
  tryAutoFoundation,
  setTableauColRef
}: TableauProps) {
  const tableauSource = drag.source?.type === "tableau" ? drag.source : null;
  const kbAttrsCtx = useContext(BoardKbAttrsContext);
  const kbCarrying = kbAttrsCtx?.kbCarrying ?? false;

  return (
    <div className="tableau-scroll" aria-label="Tableau">
      <div className="tableau" aria-label="Tableau grid">
        {state.tableau.map((col, colIndex) => {
          const isDraggedFromThisCol =
            drag.active &&
            tableauSource != null &&
            tableauSource.colIndex === colIndex;

          const isDraggingEntireColumn =
            isDraggedFromThisCol &&
            tableauSource != null &&
            tableauSource.startIndex === 0 &&
            drag.stack.length === col.length;

          // Underlay slot is always rendered; label/focusability when the column is empty
          // OR when the entire stack is being dragged out (cards are visually absent).
          const showEmptySlot = col.length === 0 || isDraggingEntireColumn;

          return (
            <div
              key={colIndex}
              className="tableau-col"
              aria-label={`Tableau column ${colIndex + 1}`}
              ref={(el) => setTableauColRef(colIndex, el)}
            >
              <div
                className="tableau-empty-slot"
                data-kb-focusable={
                  kbCarrying && showEmptySlot ? "true" : "false"
                }
                role="button"
                aria-hidden={!showEmptySlot}
                aria-label={`Tableau column ${colIndex + 1} empty slot`}
              >
                <Card card={null} emptyLabel="K" />
              </div>

              {col.map((tc, tcIndex) => {
                const inDraggedRange =
                  isDraggedFromThisCol &&
                  tableauSource != null &&
                  tcIndex >= tableauSource.startIndex &&
                  tcIndex < tableauSource.startIndex + drag.stack.length;

                if (inDraggedRange) {
                  return (
                    <Card
                      key={tc.card.id}
                      card={tc.card}
                      faceDown={tc.faceDown}
                      playable={playable.tableau[colIndex][tcIndex]}
                      className="card--ghost"
                      style={{ visibility: "hidden" }}
                    />
                  );
                }

                return (
                  <Card
                    key={tc.card.id}
                    card={tc.card}
                    faceDown={tc.faceDown}
                    playable={playable.tableau[colIndex][tcIndex]}
                    data-kb-focusable={
                      playable.tableau[colIndex][tcIndex] ? "true" : "false"
                    }
                    style={{ zIndex: tcIndex + 1 }}
                    onActivate={() =>
                      tryAutoFoundation({
                        type: "tableau",
                        index: colIndex as TableauIndex
                      })
                    }
                    onPointerDownCard={(e) =>
                      handleTableauPointerDown(e, colIndex, tcIndex)
                    }
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Tableau;
