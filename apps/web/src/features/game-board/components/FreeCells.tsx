import type { Card as EngineCard, PileRef } from "@vcell/engine";
import Card from "./Card";
import type { useCardDrag } from "@/features/game-board/animations/useCardDrag";

type FreeCellIndex = 0 | 1 | 2 | 3 | 4;

type FreeCellsProps = {
  freeCellsRow: Array<EngineCard | null | undefined>;
  playableFreeCells: boolean[];
  tryAutoFoundation: (from: PileRef) => void;
  setFreeCellRef: (index: number, el: HTMLDivElement | null) => void;
  drag: ReturnType<typeof useCardDrag>["drag"];
  handleFreeCellPointerDown: ReturnType<
    typeof useCardDrag
  >["handleFreeCellPointerDown"];
  showAcp: boolean;
};

function FreeCells({
  freeCellsRow,
  playableFreeCells,
  tryAutoFoundation,
  setFreeCellRef,
  drag,
  handleFreeCellPointerDown,
  showAcp
}: FreeCellsProps) {
  return (
    <div className="board-bottom" aria-label="Free cells">
      <div
        className={`autocomplete-drawer${
          showAcp ? " autocomplete-drawer--visible" : ""
        }`}
        aria-hidden={showAcp ? "false" : "true"}
      >
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            console.log("autocomplete clicked");
          }}
          disabled={!showAcp}
        >
          Autocomplete
        </button>
      </div>
      <div className="pile-row" aria-label="Free cells">
        {freeCellsRow.map((card, i) =>
          card === undefined ? (
            <div key={i} className="pile-spacer" aria-hidden="true" />
          ) : (
            <div
              key={i}
              className="pile-cell"
              ref={(el) => setFreeCellRef(i - 1, el)}
              data-kb-focusable={!card ? "true" : undefined}
              role={!card ? "button" : undefined}
              aria-label={
                !card ? `Free cell ${i} empty slot` : `Free cell ${i}`
              }
            >
              {/* Always show the slot */}
              <Card card={null} className="pile-slot" />

              {/* If a card exists, render it on top of the slot */}
              {card && (
                <Card
                  card={card}
                  playable={playableFreeCells[i - 1]} // -1 accounts for spacer
                  className="pile-card"
                  onActivate={() =>
                    tryAutoFoundation({
                      type: "freecell",
                      index: (i - 1) as FreeCellIndex
                    })
                  }
                  onPointerDownCard={(e) => handleFreeCellPointerDown(e, i - 1)}
                  disableInternalDrag
                  style={
                    drag.active &&
                    drag.source?.type === "freecell" &&
                    drag.source.index === i - 1
                      ? { visibility: "hidden" }
                      : undefined
                  }
                />
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default FreeCells;
