import type React from "react";
import type { Card as EngineCard } from "@vcell/engine";
import Card from "../Card";

type FoundationsProps = {
  foundationsRow: Array<EngineCard | null | undefined>;
  foundations?: Array<{ cards: EngineCard[] }>;
  drag?: {
    active: boolean;
    pending: boolean;
    isReturning: boolean;
    source:
      | { type: "foundation"; index: number }
      | { type: "freecell"; index: number }
      | { type: "tableau"; colIndex: number; startIndex: number }
      | null;
  };
  playableFoundations: boolean[];
  allowFoundationPullback: boolean;
  showTimer: boolean;
  setFoundationRef: (index: number, el: HTMLDivElement | null) => void;
  handleFoundationPointerDown?: (
    e: React.PointerEvent<HTMLDivElement>,
    index: number
  ) => void;
};

function Foundations({
  foundationsRow,
  foundations,
  drag,
  playableFoundations,
  allowFoundationPullback,
  showTimer,
  setFoundationRef,
  handleFoundationPointerDown
}: FoundationsProps) {
  return (
    <div className="board-top" aria-label="Foundations">
      <div className="pile-row" aria-label="Foundations">
        {foundationsRow.map((card, i) =>
          card === undefined ? (
            <div
              key={i}
              className={`pile-spacer ${i === 1 ? "timer-cell" : ""}`}
              aria-hidden={i !== 1 ? "true" : showTimer ? "false" : "true"}
            >
              {i === 1 && (
                <>
                  <div className="timer">00:00</div>
                  <button className="btn btn--primary">⏸︎</button>
                </>
              )}
            </div>
          ) : (
            (() => {
              const foundationIndex = i - 3;

              const isDraggingFromThisFoundation =
                !!drag &&
                (drag.active || drag.pending || drag.isReturning) &&
                drag.source?.type === "foundation" &&
                drag.source.index === foundationIndex;

              const pile = foundations?.[foundationIndex];
              const effectiveCard = pile
                ? pile.cards[
                    pile.cards.length -
                      1 -
                      (isDraggingFromThisFoundation ? 1 : 0)
                  ] ?? null
                : card ?? null;

              return (
                <div
                  key={i}
                  className="pile-cell"
                  ref={(el) => setFoundationRef(foundationIndex, el)}
                >
                  {/* Slot always visible */}
                  <Card card={null} className="pile-slot" emptyLabel="A" />

                  {/* Card layer (if present) */}
                  {effectiveCard &&
                    (() => {
                      const pullbackDisabled = !allowFoundationPullback;

                      return (
                        <Card
                          card={effectiveCard}
                          className={`pile-card${
                            pullbackDisabled ? " is-pullback-disabled" : ""
                          }`}
                          playable={playableFoundations[foundationIndex]} // -3 accounts for spacers
                          onPointerDownCard={
                            pullbackDisabled
                              ? undefined
                              : (e) =>
                                  handleFoundationPointerDown?.(
                                    e,
                                    foundationIndex
                                  )
                          }
                          disableInternalDrag={pullbackDisabled}
                        />
                      );
                    })()}
                </div>
              );
            })()
          )
        )}
      </div>
    </div>
  );
}

export default Foundations;
