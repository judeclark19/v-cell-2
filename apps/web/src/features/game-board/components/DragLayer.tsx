import { Card as EngineCard } from "@vcell/engine";
import Card from "./Card";
import { useBoardControlSystem } from "../board-control/useBoardControlSystem_new";

export default function DragLayer({
  boardController
}: {
  boardController: ReturnType<typeof useBoardControlSystem>;
}) {
  const { drag, resetDrag, cardFlight } = boardController;

  if (
    !(drag.active || drag.pending || drag.isReturning) ||
    drag.stack.length === 0
  )
    return null;
  return (
    <div
      className={`drag-layer ${drag.isReturning ? "is-returning" : ""} ${
        cardFlight?.active ? "is-kb-flight" : ""
      }`}
      onTransitionEnd={() => {
        if (drag.isReturning || cardFlight?.active) resetDrag();
      }}
      style={{
        left: 0,
        top: 0,
        transform: `translate3d(${drag.baseLeft + drag.x}px, ${
          drag.baseTop + drag.y
        }px, 0)`,
        transitionDuration:
          cardFlight?.active && cardFlight.durationMs != null
            ? `${cardFlight.durationMs}ms`
            : undefined
      }}
      aria-hidden="true"
    >
      <div className="drag-layer__stack tableau-col">
        {drag.stack.map((tc, i) => (
          <Card
            key={tc.card.id}
            card={tc.card as EngineCard}
            region="drag-layer"
            faceDown={tc.faceDown}
            playable
            style={{ zIndex: i + 1 }}
          />
        ))}
      </div>
    </div>
  );
}
