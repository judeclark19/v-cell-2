import Card from "./Card";
import { useBoardControlSystem } from "../board-control/useBoardControlSystem";
import {
  selectCanUndo,
  selectFreeCellCards,
  selectIsAutoCompleting,
  selectPlayableMask,
  selectRules,
  selectShowAcp,
  selectUndosRemaining,
  setIsAutoCompleting
} from "@/state/game/gameSlice";
import { useDispatch, useSelector } from "react-redux";
import {
  AutocompleteDrawer,
  BoardBottom,
  Button,
  PileCardLayer,
  PileCell,
  PileRow,
  PileSpacer
} from "@vcell/ui";
import { RotateCcw, Undo2 } from "lucide-react";

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
  const rules = useSelector(selectRules);
  const undosRemaining = useSelector(selectUndosRemaining);
  const canUndo = useSelector(selectCanUndo);
  const showUndoCount =
    rules.undoLimit !== "unlimited" && rules.undoLimit !== 0;

  const { kbState, cardFlight } = boardController;

  return (
    <BoardBottom aria-label="Free cells">
      <AutocompleteDrawer visible={showAcp} aria-hidden={!showAcp}>
        <Button
          onClick={() => {
            if (isAutoCompleting) dispatch(setIsAutoCompleting(false));
            else dispatch(setIsAutoCompleting(true));
          }}
          disabled={!showAcp}
        >
          {isAutoCompleting ? "Stop" : "Autocomplete"}
        </Button>
      </AutocompleteDrawer>
      <PileRow aria-label="Free cells">
        <PileSpacer aria-hidden="true" />
        {freeCellCards.map((card, i) => (
          <PileCell
            key={i}
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
                  <PileCardLayer>
                    <Card
                      card={card}
                      region="freecell"
                      regionIndex={i}
                      playable={playable.freeCells[i]}
                      data-kb-focusable={true}
                      onPointerDownCard={(e) =>
                        boardController.handleFreeCellPointerDown(e, i)
                      }
                      onPointerUp={boardController.handleCardDoubleTap}
                      style={style}
                    />
                  </PileCardLayer>
                );
              })()}
          </PileCell>
        ))}
        <PileSpacer aria-hidden="true">
          <Button
            type="button"
            onClick={boardController.undo}
            disabled={!canUndo}
            aria-label={
              showUndoCount ? `Undo, ${undosRemaining} remaining` : "Undo"
            }
            title={showUndoCount ? `${undosRemaining} undos remaining` : "Undo"}
          >
            <Undo2 aria-hidden="true" size={20} />
            {showUndoCount ? (
              <span aria-hidden="true" style={{ marginTop: "3px" }}>
                {undosRemaining}
              </span>
            ) : null}
          </Button>
          <Button
            type="button"
            onClick={boardController.restartDeal}
            title="Restart deal"
          >
            <RotateCcw aria-hidden="true" size={18} />
          </Button>
        </PileSpacer>
      </PileRow>
    </BoardBottom>
  );
}

export default FreeCells;
