import { useContext } from "react";
import Card from "./Card";
import { BoardKbAttrsContext } from "../keyboard/boardKbAttrs";
import { useSelector } from "react-redux";
import { selectHistory, selectPlayableMask } from "@/state/game/gameSlice";
import { useBoardController } from "../hooks/useBoardController";

function Tableau({ vm }: { vm: ReturnType<typeof useBoardController> }) {
  const kbAttrsCtx = useContext(BoardKbAttrsContext);
  const kbCarrying = kbAttrsCtx?.kbCarrying ?? false;
  const kbFlight = vm.drag.kbFlight;

  // game slice
  const playable = useSelector(selectPlayableMask);
  const history = useSelector(selectHistory);

  return (
    <div className="tableau-scroll" aria-label="Tableau">
      <div className="tableau" aria-label="Tableau grid">
        {history.present.tableau.map((col, colIndex) => {
          const tableauSource =
            vm.drag.source?.type === "tableau" ? vm.drag.source : null;

          const isDraggedFromThisCol =
            vm.drag.active &&
            tableauSource != null &&
            tableauSource.colIndex === colIndex;

          const isKbFlightDestCol =
            kbFlight.active &&
            kbFlight.dropTarget?.type === "tableau" &&
            kbFlight.dropTarget.colIndex === colIndex;

          const isDraggingEntireColumn =
            isDraggedFromThisCol &&
            tableauSource != null &&
            tableauSource.startIndex === 0 &&
            vm.drag.stack.length === col.length;

          // Underlay slot is always rendered; label/focusability when the column is empty
          // OR when the entire stack is being dragged out (cards are visually absent).
          const showEmptySlot = col.length === 0 || isDraggingEntireColumn;

          return (
            <div
              key={colIndex}
              className="tableau-col"
              aria-label={`Tableau column ${colIndex + 1}`}
              ref={(el) => vm.setTableauColRef(colIndex, el)}
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
                  data-tableauIndex={-1}
                />
              </div>

              {col.map((tc, tcIndex) => {
                const inDraggedRange =
                  isDraggedFromThisCol &&
                  tableauSource != null &&
                  tcIndex >= tableauSource.startIndex &&
                  tcIndex < tableauSource.startIndex + vm.drag.stack.length;

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
                  isKbFlightDestCol && kbFlight.cardIds.includes(tc.card.id);

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
                    onActivate={(el) => vm.tryAutoFoundationFromEl(el)}
                    onPointerDownCard={(e) =>
                      vm.handleTableauPointerDown(e, colIndex, tcIndex)
                    }
                    onPointerUp={vm.onCardPointerUp}
                    onAutoFreeCell={(el) => vm.tryAutoFreeCellFromEl(el)}
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
