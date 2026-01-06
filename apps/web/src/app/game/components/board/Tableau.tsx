import type { Card as EngineCard, PileRef } from "@vcell/engine";
import Card from "../Card";
import type { useCardDrag } from "@/ui/useCardDrag";

type TableauIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

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

  return (
    <div className="tableau-scroll" aria-label="Tableau">
      <div className="tableau" aria-label="Tableau grid">
        {state.tableau.map((col, colIndex) => (
          <div
            key={colIndex}
            className="tableau-col"
            aria-label={`Tableau column ${colIndex + 1}`}
            ref={(el) => setTableauColRef(colIndex, el)}
          >
            {col.length === 0 ? (
              <Card card={null} emptyLabel="K" />
            ) : (
              col.map((tc, tcIndex) => {
                const isDraggedFromThisCol =
                  drag.active &&
                  tableauSource != null &&
                  tableauSource.colIndex === colIndex;

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
                      disableInternalDrag
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
                    disableInternalDrag
                  />
                );
              })
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Tableau;
