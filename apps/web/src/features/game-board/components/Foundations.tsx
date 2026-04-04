import type { Card as EngineCard } from "@vcell/engine";
import Card from "./Card";
import { formatElapsed } from "../../../ui/utils";
import { useDispatch, useSelector } from "react-redux";
import {
  selectFoundationCards,
  selectPlayableMask,
  selectRules,
  selectStatus
} from "@/state/game/gameSlice";
import {
  setPaused,
  selectStartedAtMs,
  selectTimeElapsedMs
} from "@/state/session/sessionSlice";
import { openPauseModal, selectShowTimer } from "@/state/ui/uiSlice";
import { useBoardControlSystem } from "../board-control/useBoardControlSystem";
import { RootState } from "@/state/reduxStore";

type FoundationProps = {
  i: number;
  foundationIndex: number;
  card: EngineCard | null;
  boardController: ReturnType<typeof useBoardControlSystem>;
};

function Foundation({
  i,
  foundationIndex,
  card,
  boardController
}: FoundationProps) {
  const { kbState, cardFlight, drag, handleFoundationPointerDown } =
    boardController;

  const rules = useSelector(selectRules);
  const pile = useSelector(
    (state: RootState) =>
      state.game.history.present.foundations[foundationIndex]
  );
  const playable = useSelector(selectPlayableMask);

  const pullbackDisabled = !rules.allowFoundationPullback;

  const isDraggingFromThisFoundation =
    !!drag &&
    (drag.active || drag.pending || drag.isReturning) &&
    drag.source?.type === "foundation" &&
    drag.source.index === foundationIndex;

  const displayIndex = pile
    ? pile.cards.length - 1 - (isDraggingFromThisFoundation ? 1 : 0)
    : -1;

  const effectiveCard = pile ? (pile.cards[displayIndex] ?? null) : card;

  // Card directly underneath the displayed card (used as an underlay).
  const underlayCard = pile
    ? displayIndex - 1 >= 0
      ? (pile.cards[displayIndex - 1] ?? null)
      : null
    : null;

  const isEmptySlot = !effectiveCard;

  const flyingCardIds = cardFlight.stack.map((card) => card.id);

  const hideForKbFlightDest =
    !!cardFlight &&
    cardFlight.active &&
    cardFlight.dropTarget?.type === "foundation" &&
    cardFlight.dropTarget.index === foundationIndex &&
    !!effectiveCard &&
    flyingCardIds.includes(effectiveCard.id);

  const cardStyle = hideForKbFlightDest
    ? ({ visibility: "hidden" } as const)
    : undefined;

  return (
    <div
      key={i}
      className="pile-cell"
      data-kb-focusable={kbState.carrying && isEmptySlot ? "true" : undefined}
      role={kbState.carrying && isEmptySlot ? "button" : undefined}
      aria-label={
        isEmptySlot
          ? `Foundation ${foundationIndex + 1} empty slot`
          : `Foundation ${foundationIndex + 1}`
      }
    >
      {/* Slot always visible */}
      <Card
        card={null}
        className="pile-slot"
        emptyLabel="A"
        region="foundation"
        regionIndex={i}
      />

      {/* Card layer (if present) */}
      {effectiveCard && (
        <>
          {underlayCard && (
            <Card
              card={underlayCard}
              className="pile-card pile-card--underlay"
              playable={false}
              region="foundation"
              regionIndex={i}
            />
          )}

          <Card
            card={effectiveCard}
            region="foundation"
            regionIndex={i}
            className={`pile-card${pullbackDisabled ? " is-pullback-disabled" : ""}`}
            playable={playable.foundations[foundationIndex]} // -3 accounts for spacers
            data-kb-focusable={
              playable.foundations[foundationIndex] ? "true" : "false"
            }
            onPointerDownCard={
              pullbackDisabled
                ? undefined
                : (e) => handleFoundationPointerDown?.(e, foundationIndex)
            }
            style={cardStyle}
          />
        </>
      )}
    </div>
  );
}

function Foundations({
  boardController
}: {
  boardController: ReturnType<typeof useBoardControlSystem>;
}) {
  const dispatch = useDispatch();
  // session state
  const startedAtMs = useSelector(selectStartedAtMs);
  const timeElapsedMs = useSelector(selectTimeElapsedMs);
  // Game state
  const status = useSelector(selectStatus);
  const foundationCards = useSelector(selectFoundationCards);
  // UI state
  const showTimer = useSelector(selectShowTimer);

  return (
    <div className="board-top" aria-label="Foundations">
      <div className="pile-row" aria-label="Foundations">
        <div className="timer-cell" aria-hidden={showTimer ? "false" : "true"}>
          <div className={`timer${!startedAtMs ? " muted" : ""}`}>
            {showTimer ? formatElapsed(timeElapsedMs) : ""}
          </div>
          <button
            className="btn btn--primary"
            aria-label="Pause timer"
            type="button"
            onClick={() => {
              dispatch(openPauseModal());
              dispatch(setPaused(true));
            }}
            disabled={
              !startedAtMs || status === "won" || status === "abandoned"
            }
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="var(--surface)"
              aria-hidden="true"
            >
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          </button>
        </div>
        {foundationCards.map((card, foundationIndex) => (
          <Foundation
            key={`foundation-${foundationIndex}`}
            i={foundationIndex}
            foundationIndex={foundationIndex}
            card={card}
            boardController={boardController}
          />
        ))}
      </div>
    </div>
  );
}

export default Foundations;
