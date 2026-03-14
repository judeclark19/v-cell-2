import { useContext } from "react";
import type { Card as EngineCard } from "@vcell/engine";
import Card from "./Card";
import { BoardKbAttrsContext } from "../keyboard/boardKbAttrs";
import { DragState } from "../animations/dragTypes";
import { formatElapsed } from "../../../ui/utils";
import { useDispatch, useSelector } from "react-redux";
import { selectRules, selectStatus } from "@/state/game/gameSlice";
import {
  setPaused,
  selectStartedAtMs,
  selectTimeElapsedMs
} from "@/state/session/sessionSlice";
import { useBoardController } from "../hooks/useBoardController";
import { selectShowTimer, setIsAnyModalOpen } from "@/state/ui/uiSlice";

type FoundationProps = {
  i: number;
  foundationIndex: number;
  card: EngineCard | null;
  kbCarrying: boolean;
  kbFlight?: DragState<{ card: EngineCard }>["kbFlight"];
  vm: ReturnType<typeof useBoardController>;
};

function Foundation({
  i,
  foundationIndex,
  card,
  kbCarrying,
  kbFlight,
  vm
}: FoundationProps) {
  const { drag, playable, setFoundationRef, handleFoundationPointerDown } = vm;

  const rules = useSelector(selectRules);
  const pullbackDisabled = !rules.allowFoundationPullback;

  const isDraggingFromThisFoundation =
    !!drag &&
    (drag.active || drag.pending || drag.isReturning) &&
    drag.source?.type === "foundation" &&
    drag.source.index === foundationIndex;

  const pile = vm.state.foundations?.[foundationIndex];

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

  const hideForKbFlightDest =
    !!kbFlight &&
    kbFlight.active &&
    kbFlight.dropTarget?.type === "foundation" &&
    kbFlight.dropTarget.index === foundationIndex &&
    !!effectiveCard &&
    kbFlight.cardIds.includes(effectiveCard.id);

  const cardStyle = hideForKbFlightDest
    ? ({ visibility: "hidden" } as const)
    : undefined;

  return (
    <div
      key={i}
      className="pile-cell"
      ref={(el) => setFoundationRef(foundationIndex, el)}
      data-kb-focusable={kbCarrying && isEmptySlot ? "true" : undefined}
      role={kbCarrying && isEmptySlot ? "button" : undefined}
      aria-label={
        isEmptySlot
          ? `Foundation ${foundationIndex + 1} empty slot`
          : `Foundation ${foundationIndex + 1}`
      }
    >
      {/* Slot always visible */}
      <Card card={null} className="pile-slot" emptyLabel="A" />

      {/* Card layer (if present) */}
      {effectiveCard && (
        <>
          {underlayCard && (
            <Card
              card={underlayCard}
              className="pile-card pile-card--underlay"
              playable={false}
            />
          )}

          <Card
            card={effectiveCard}
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
  boardController: ReturnType<typeof useBoardController>;
}) {
  const vm = boardController;
  const kbAttrsCtx = useContext(BoardKbAttrsContext);
  const kbCarrying = kbAttrsCtx?.kbCarrying ?? false;
  const kbFlight = vm?.drag?.kbFlight;

  const dispatch = useDispatch();
  // session state
  const startedAtMs = useSelector(selectStartedAtMs);
  const timeElapsedMs = useSelector(selectTimeElapsedMs);
  // Game state
  const status = useSelector(selectStatus);
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
              dispatch(setIsAnyModalOpen(true));
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
        {vm.foundationCards.map((card, foundationIndex) => (
          <Foundation
            key={`foundation-${foundationIndex}`}
            i={foundationIndex}
            foundationIndex={foundationIndex}
            card={card}
            kbCarrying={kbCarrying}
            kbFlight={kbFlight}
            vm={vm}
          />
        ))}
      </div>
    </div>
  );
}

export default Foundations;
