import Card from "./Card";
import { useBoardControlSystem } from "../board-control/useBoardControlSystem_new";

function FreeCells({
  boardController
}: {
  boardController: ReturnType<typeof useBoardControlSystem>;
}) {
  return (
    <div className="board-bottom" aria-label="Free cells">
      <div
        className={`autocomplete-drawer${
          boardController.showAcp ? " autocomplete-drawer--visible" : ""
        }`}
        aria-hidden={boardController.showAcp ? "false" : "true"}
      >
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            if (boardController.isAutoCompleting)
              boardController.stopAutoComplete();
            else boardController.runAutoComplete();
          }}
          disabled={!boardController.showAcp}
        >
          {boardController.isAutoCompleting ? "Stop" : "Autocomplete"}
        </button>
      </div>
      <div className="pile-row" aria-label="Free cells">
        {boardController.freeCellsRow.map((card, i) =>
          card === undefined ? (
            <div key={i} className="pile-spacer" aria-hidden="true" />
          ) : (
            <div
              key={i}
              className="pile-cell"
              ref={(el) => boardController.setFreeCellRef(i - 1, el)}
              data-kb-focusable={kbCarrying && !card ? "true" : undefined}
              role={kbCarrying && !card ? "button" : undefined}
              aria-label={
                !card ? `Free cell ${i} empty slot` : `Free cell ${i}`
              }
            >
              {/* Always show the slot */}
              <Card
                card={null}
                region="freecell"
                regionIndex={i}
                className="pile-slot"
              />

              {/* If a card exists, render it on top of the slot */}
              {card &&
                (() => {
                  const freeCellIndex = i - 1;

                  const hideForPointerDrag =
                    boardController.drag.active &&
                    boardController.drag.source?.type === "freecell" &&
                    boardController.drag.source.index === freeCellIndex;

                  const hideForKbFlightDest =
                    kbFlight.active &&
                    kbFlight.dropTarget?.type === "freecell" &&
                    kbFlight.dropTarget.index === freeCellIndex &&
                    kbFlight.cardIds.includes(card.id);

                  const style =
                    hideForPointerDrag || hideForKbFlightDest
                      ? ({ visibility: "hidden" } as const)
                      : undefined;

                  return (
                    <Card
                      card={card}
                      region="freecell"
                      regionIndex={i}
                      playable={boardController.playable.freeCells[i - 1]} // -1 accounts for spacer
                      data-kb-focusable={
                        boardController.playable.freeCells[i - 1]
                          ? "true"
                          : "false"
                      }
                      className="pile-card"
                      onActivate={(el) =>
                        boardController.tryAutoFoundationFromEl(el)
                      }
                      onPointerDownCard={(e) =>
                        boardController.handleFreeCellPointerDown(e, i - 1)
                      }
                      onPointerUp={boardController.onCardPointerUp}
                      style={style}
                    />
                  );
                })()}
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default FreeCells;
