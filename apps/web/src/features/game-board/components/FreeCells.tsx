import Card from "./Card";
import { useBoardControlSystem } from "../board-control_new/useBoardControlSystem";
import {
  selectFreeCellCards,
  selectIsAutoCompleting,
  selectPlayableMask,
  selectShowAcp
} from "@/state/game/gameSlice/selectors";
import { useDispatch, useSelector } from "react-redux";
import { setIsAutoCompleting } from "@/state/game/gameSlice";

function FreeCells({
  boardController
}: {
  boardController: ReturnType<typeof useBoardControlSystem>;
}) {
  const dispatch = useDispatch();

  // game slice
  const freeCellCards = useSelector(selectFreeCellCards);
  const showAcp = useSelector(selectShowAcp);
  const isAutoCompleting = useSelector(selectIsAutoCompleting);
  const playable = useSelector(selectPlayableMask);

  const { kbState, cardFlight } = boardController;

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
            if (isAutoCompleting) dispatch(setIsAutoCompleting(false));
            else dispatch(setIsAutoCompleting(true));
          }}
          disabled={!showAcp}
        >
          {isAutoCompleting ? "Stop" : "Autocomplete"}
        </button>
      </div>
      <div className="pile-row" aria-label="Free cells">
        <div className="pile-spacer" aria-hidden="true" />
        {freeCellCards.map((card, i) => (
          <div
            key={i}
            className="pile-cell"
            role={kbState.carrying && !card ? "button" : undefined}
            aria-label={!card ? `Free cell ${i} empty slot` : `Free cell ${i}`}
          >
            {/* Always show the slot */}
            <Card
              card={null}
              region="freecell"
              regionIndex={i}
              className="pile-slot"
              data-kb-focusable={kbState.carrying && !card ? "true" : undefined}
              tabIndex={-1}
            />

            {/* If a card exists, render it on top of the slot */}
            {card &&
              (() => {
                const freeCellIndex = i;

                const hideForPointerDrag =
                  (boardController.drag.active ||
                    boardController.drag.isReturning) &&
                  boardController.drag.source?.type === "freecell" &&
                  boardController.drag.source.index === freeCellIndex;

                const flyingCardIds = cardFlight.stack.map((c) => c.id);

                const hideForCardFlightDest =
                  cardFlight.active &&
                  cardFlight.dropTarget?.type === "freecell" &&
                  cardFlight.dropTarget.index === freeCellIndex &&
                  flyingCardIds.includes(card.id);

                const style =
                  hideForPointerDrag || hideForCardFlightDest
                    ? ({ visibility: "hidden" } as const)
                    : undefined;

                return (
                  <Card
                    card={card}
                    region="freecell"
                    regionIndex={i}
                    playable={playable.freeCells[i]}
                    data-kb-focusable={true}
                    className="pile-card"
                    onPointerDownCard={(e) =>
                      boardController.handleFreeCellPointerDown(e, i)
                    }
                    onPointerUp={boardController.handleCardDoubleTap}
                    style={style}
                  />
                );
              })()}
          </div>
        ))}
        <div className="pile-spacer" aria-hidden="true" />
      </div>
    </div>
  );
}

export default FreeCells;
