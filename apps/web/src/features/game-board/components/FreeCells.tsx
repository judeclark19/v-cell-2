import type { Card as EngineCard, PileRef } from "@vcell/engine";
import { useContext } from "react";
import Card from "./Card";
import { BoardKbAttrsContext } from "../keyboard/boardKbAttrs";
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
  isAutoCompleting: boolean;
  runAutoComplete: () => void;
  stopAutoComplete: () => void;
  seedReady: boolean;
  paused: boolean;
  shouldShowWinModal: boolean;
};

function FreeCells({
  freeCellsRow,
  playableFreeCells,
  tryAutoFoundation,
  setFreeCellRef,
  drag,
  handleFreeCellPointerDown,
  showAcp,
  isAutoCompleting,
  runAutoComplete,
  stopAutoComplete,
  seedReady,
  paused,
  shouldShowWinModal
}: FreeCellsProps) {
  const kbAttrsCtx = useContext(BoardKbAttrsContext);
  const kbCarrying = kbAttrsCtx?.kbCarrying ?? false;
  const kbFlight = drag.kbFlight;
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
            if (isAutoCompleting) stopAutoComplete();
            else runAutoComplete();
          }}
          disabled={!seedReady || paused || shouldShowWinModal}
        >
          {isAutoCompleting ? "Stop" : "Autocomplete"}
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
              data-kb-focusable={kbCarrying && !card ? "true" : undefined}
              role={kbCarrying && !card ? "button" : undefined}
              aria-label={
                !card ? `Free cell ${i} empty slot` : `Free cell ${i}`
              }
            >
              {/* Always show the slot */}
              <Card card={null} className="pile-slot" />

              {/* If a card exists, render it on top of the slot */}
              {card &&
                (() => {
                  const freeCellIndex = i - 1;

                  const hideForPointerDrag =
                    drag.active &&
                    drag.source?.type === "freecell" &&
                    drag.source.index === freeCellIndex;

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
                      playable={playableFreeCells[i - 1]} // -1 accounts for spacer
                      data-kb-focusable={
                        playableFreeCells[i - 1] ? "true" : "false"
                      }
                      className="pile-card"
                      onActivate={() =>
                        tryAutoFoundation({
                          type: "freecell",
                          index: (i - 1) as FreeCellIndex
                        })
                      }
                      onPointerDownCard={(e) =>
                        handleFreeCellPointerDown(e, i - 1)
                      }
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
