import Card from "./Card";
import { useSelector } from "react-redux";
import { selectHistory, selectPlayableMask } from "@/state/game/gameSlice";
import { useBoardControlSystem } from "../board-control_new/useBoardControlSystem";

function Tableau({
  boardController
}: {
  boardController: ReturnType<typeof useBoardControlSystem>;
}) {
  const { kbCarrying, cardFlight } = boardController;

  // game slice
  const playable = useSelector(selectPlayableMask);
  const history = useSelector(selectHistory);

  return (
    <div className="tableau-scroll" aria-label="Tableau">
      <div className="tableau" aria-label="Tableau grid">
        {history.present.tableau.map((col, colIndex) => {
          const tableauSource =
            boardController.drag.source?.type === "tableau"
              ? boardController.drag.source
              : null;

          const isDraggedFromThisCol =
            (boardController.drag.active ||
              boardController.drag.pending ||
              boardController.drag.isReturning) &&
            tableauSource != null &&
            tableauSource.index === colIndex;

          const isKbFlightDestCol =
            cardFlight.active &&
            cardFlight.dropTarget?.type === "tableau" &&
            cardFlight.dropTarget.index === colIndex;

          const isDraggingEntireColumn =
            isDraggedFromThisCol &&
            tableauSource != null &&
            tableauSource.startIndex === 0 &&
            boardController.drag.stack.length === col.length;

          // Underlay slot is always rendered; label/focusability when the column is empty
          // OR when the entire stack is being dragged out (cards are visually absent).
          const showEmptySlot = col.length === 0 || isDraggingEntireColumn;

          return (
            <div
              key={colIndex}
              className="tableau-col"
              aria-label={`Tableau column ${colIndex + 1}`}
              // ref={(el) => boardController.setTableauColRef(colIndex, el)}
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
                <Card
                  card={null}
                  emptyLabel="K"
                  region="tableau"
                  regionIndex={colIndex}
                  data-tableauindex={-1}
                />
              </div>

              {col.map((tc, tcIndex) => {
                const inDraggedRange =
                  isDraggedFromThisCol &&
                  tableauSource != null &&
                  tcIndex >= tableauSource.startIndex &&
                  tcIndex <
                    tableauSource.startIndex +
                      boardController.drag.stack.length;

                if (inDraggedRange) {
                  return (
                    <Card
                      key={tc.card.id}
                      card={tc.card}
                      region="tableau"
                      regionIndex={colIndex}
                      positionInStack={tcIndex}
                      faceDown={tc.faceDown}
                      playable={playable.tableau[colIndex][tcIndex]}
                      className="card--ghost"
                      style={{ visibility: "hidden" }}
                    />
                  );
                }

                const isSuppressedByKbFlight =
                  isKbFlightDestCol && cardFlight.cardIds.includes(tc.card.id);

                if (isSuppressedByKbFlight) {
                  return (
                    <Card
                      key={tc.card.id}
                      card={tc.card}
                      region="tableau"
                      regionIndex={colIndex}
                      positionInStack={tcIndex}
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
                    region="tableau"
                    regionIndex={colIndex}
                    positionInStack={tcIndex}
                    faceDown={tc.faceDown}
                    playable={playable.tableau[colIndex][tcIndex]}
                    data-kb-focusable={
                      playable.tableau[colIndex][tcIndex] ? "true" : "false"
                    }
                    style={{ zIndex: tcIndex + 1 }}
                    onActivate={(el) => boardController.tryAutoFoundation(el)}
                    onPointerDownCard={(e) =>
                      boardController.handleTableauPointerDown(
                        e,
                        colIndex,
                        tcIndex
                      )
                    }
                    onPointerUp={boardController.handleCardDoubleTap}
                    onAutoFreeCell={(el) => boardController.tryAutoFreeCell(el)}
                  />
                );
              })}
              {/*
                Hidden tail anchor used for kb flight destination.
                This extra card participates in the normal tableau stacking layout, so its
                DOMRect represents the correct end-of-column landing position (with overlap).
              */}
              {col.length > 0 &&
                (() => {
                  const tail = col[col.length - 1];
                  return (
                    <Card
                      key={`tail-anchor-${colIndex}-${tail.card.id}`}
                      card={tail.card}
                      region="tableau"
                      regionIndex={colIndex}
                      positionInStack={col.length - 1}
                      faceDown={tail.faceDown}
                      playable={false}
                      className="card--ghost"
                      data-tableau-tail-anchor="true"
                      data-tableau-col={String(colIndex)}
                      style={{ visibility: "hidden" }}
                    />
                  );
                })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Tableau;
