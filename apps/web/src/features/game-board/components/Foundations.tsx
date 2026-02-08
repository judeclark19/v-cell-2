import type React from "react";
import { useContext } from "react";
import type { Card as EngineCard } from "@vcell/engine";
import Card from "./Card";
import { BoardKbAttrsContext } from "../keyboard/boardKbAttrs";
import { DragState } from "../animations/dragTypes";

type FoundationProps = {
  i: number;
  foundationIndex: number;
  card: EngineCard | null;
  foundations?: Array<{ cards: EngineCard[] }>;
  drag?: DragState<{ card: EngineCard }>;
  playableFoundations: boolean[];
  allowFoundationPullback: boolean;
  kbCarrying: boolean;
  kbFlight?: DragState<{ card: EngineCard }>["kbFlight"];
  setFoundationRef: (index: number, el: HTMLDivElement | null) => void;
  handleFoundationPointerDown?: (
    e: React.PointerEvent<HTMLDivElement>,
    index: number
  ) => void;
};

function Foundation({
  i,
  foundationIndex,
  card,
  foundations,
  drag,
  playableFoundations,
  allowFoundationPullback,
  kbCarrying,
  kbFlight,
  setFoundationRef,
  handleFoundationPointerDown
}: FoundationProps) {
  const isDraggingFromThisFoundation =
    !!drag &&
    (drag.active || drag.pending || drag.isReturning) &&
    drag.source?.type === "foundation" &&
    drag.source.index === foundationIndex;

  const pile = foundations?.[foundationIndex];

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

  const pullbackDisabled = !allowFoundationPullback;

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
            playable={playableFoundations[foundationIndex]} // -3 accounts for spacers
            data-kb-focusable={
              playableFoundations[foundationIndex] ? "true" : "false"
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

type FoundationsProps = {
  foundationCards: Array<EngineCard | null>;
  foundations?: Array<{ cards: EngineCard[] }>;
  drag?: DragState<{ card: EngineCard }>;
  playableFoundations: boolean[];
  allowFoundationPullback: boolean;
  showTimer: boolean;
  timeElapsedMs: number;
  hasStarted: boolean;
  onPause: () => void;
  setFoundationRef: (index: number, el: HTMLDivElement | null) => void;
  handleFoundationPointerDown?: (
    e: React.PointerEvent<HTMLDivElement>,
    index: number
  ) => void;
  isWon: boolean;
  isAbandoned: boolean;
};

function Foundations({
  foundationCards,
  foundations,
  drag,
  playableFoundations,
  allowFoundationPullback,
  showTimer,
  timeElapsedMs,
  hasStarted,
  onPause,
  setFoundationRef,
  handleFoundationPointerDown,
  isWon,
  isAbandoned
}: FoundationsProps) {
  const kbAttrsCtx = useContext(BoardKbAttrsContext);
  const kbCarrying = kbAttrsCtx?.kbCarrying ?? false;
  const kbFlight = drag?.kbFlight;

  const formatElapsed = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const mm = String(minutes).padStart(2, "0");
    const ss = String(seconds).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  return (
    <div className="board-top" aria-label="Foundations">
      <div className="pile-row" aria-label="Foundations">
        <div className="timer-cell" aria-hidden={showTimer ? "false" : "true"}>
          <div className={`timer${!hasStarted ? " muted" : ""}`}>
            {showTimer ? formatElapsed(timeElapsedMs) : ""}
          </div>
          <button
            className="btn btn--primary"
            aria-label="Pause timer"
            type="button"
            onClick={onPause}
            disabled={!hasStarted || isWon || isAbandoned}
          >
            ⏸︎
          </button>
        </div>
        {foundationCards.map((card, foundationIndex) => (
          <Foundation
            key={`foundation-${foundationIndex}`}
            i={foundationIndex}
            foundationIndex={foundationIndex}
            card={card}
            foundations={foundations}
            drag={drag}
            playableFoundations={playableFoundations}
            allowFoundationPullback={allowFoundationPullback}
            kbCarrying={kbCarrying}
            kbFlight={kbFlight}
            setFoundationRef={setFoundationRef}
            handleFoundationPointerDown={handleFoundationPointerDown}
          />
        ))}
      </div>
    </div>
  );
}

export default Foundations;
