import { useContext } from "react";
import Card from "./Card";
import { BoardKbAttrsContext } from "../keyboard/boardKbAttrs";
import { useBoardController } from "../hooks/useBoardController";

function FreeCells({ vm }: { vm: ReturnType<typeof useBoardController> }) {
  const kbAttrsCtx = useContext(BoardKbAttrsContext);
  const kbCarrying = kbAttrsCtx?.kbCarrying ?? false;
  const kbFlight = vm.drag.kbFlight;

  return (
    <div className="board-bottom" aria-label="Free cells">
      <div
        className={`autocomplete-drawer${
          vm.showAcp ? " autocomplete-drawer--visible" : ""
        }`}
        aria-hidden={vm.showAcp ? "false" : "true"}
      >
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            if (vm.isAutoCompleting) vm.stopAutoComplete();
            else vm.runAutoComplete();
          }}
          disabled={!vm.showAcp}
        >
          {vm.isAutoCompleting ? "Stop" : "Autocomplete"}
        </button>
      </div>
      <div className="pile-row" aria-label="Free cells">
        {vm.freeCellsRow.map((card, i) =>
          card === undefined ? (
            <div key={i} className="pile-spacer" aria-hidden="true" />
          ) : (
            <div
              key={i}
              className="pile-cell"
              ref={(el) => vm.setFreeCellRef(i - 1, el)}
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
                    vm.drag.active &&
                    vm.drag.source?.type === "freecell" &&
                    vm.drag.source.index === freeCellIndex;

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
                      playable={vm.playable.freeCells[i - 1]} // -1 accounts for spacer
                      data-kb-focusable={
                        vm.playable.freeCells[i - 1] ? "true" : "false"
                      }
                      className="pile-card"
                      onActivate={(el) => vm.tryAutoFoundationFromEl(el)}
                      onPointerDownCard={(e) =>
                        vm.handleFreeCellPointerDown(e, i - 1)
                      }
                      onPointerUp={vm.onCardPointerUp}
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
