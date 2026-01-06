import type { Card as EngineCard, PileRef } from "@vcell/engine";
import Card from "../Card";
import type { useTableauDrag } from "@/ui/useTableauDrag";

type TableauIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type TableauProps = {
  state: {
    tableau: Array<Array<{ card: EngineCard; faceDown: boolean }>>;
  };
  playable: {
    tableau: Array<Array<boolean>>;
  };
  drag: ReturnType<typeof useTableauDrag>["drag"];
  handleTableauPointerDown: ReturnType<
    typeof useTableauDrag
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
                  drag.source?.type === "tableau" &&
                  drag.source.colIndex === colIndex;

                const inDraggedRange =
                  isDraggedFromThisCol &&
                  drag.source != null &&
                  tcIndex >= drag.source.startIndex &&
                  tcIndex < drag.source.startIndex + drag.stack.length;

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
