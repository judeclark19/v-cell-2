import type { Card as EngineCard } from "@vcell/engine";
import { useContext } from "react";
import Card from "./Card";
import type { useCardDrag } from "@/features/game-board/animations/useCardDrag";
import { BoardKbAttrsContext } from "../keyboard/boardKbAttrs";

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
  /** Element-based auto-foundation (enables flight animation). Prefer this when provided. */
  tryAutoFoundationFromEl: (el: HTMLElement) => boolean;
  tryAutoFreeCellFromEl: (el: HTMLElement) => boolean;
  setTableauColRef: (colIndex: number, el: HTMLDivElement | null) => void;
  isWon: boolean;
  onCardPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
};

function Tableau({
  state,
  playable,
  drag,
  handleTableauPointerDown,
  tryAutoFoundationFromEl,
  tryAutoFreeCellFromEl,
  setTableauColRef,
  onCardPointerUp
}: TableauProps) {
  const kbAttrsCtx = useContext(BoardKbAttrsContext);
  const kbCarrying = kbAttrsCtx?.kbCarrying ?? false;
  const kbFlight = drag.kbFlight;

  return (
    <div className="tableau-scroll" aria-label="Tableau">
      <div className="tableau" aria-label="Tableau grid">
        {state.tableau.map((col, colIndex) => {
          const tableauSource =
            drag.source?.type === "tableau" ? drag.source : null;

          const isDraggedFromThisCol =
            drag.active &&
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

                const isSuppressedByKbFlight =
                  isKbFlightDestCol && kbFlight.cardIds.includes(tc.card.id);

                if (isSuppressedByKbFlight) {
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
                    onActivate={(el) => tryAutoFoundationFromEl(el)}
                    onPointerDownCard={(e) =>
                      handleTableauPointerDown(e, colIndex, tcIndex)
                    }
                    onPointerUp={onCardPointerUp}
                    onAutoFreeCell={(el) => tryAutoFreeCellFromEl(el)}
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
