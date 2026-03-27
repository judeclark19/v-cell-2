import { Card as EngineCard } from "@vcell/engine";
import Card from "./Card";
import { useBoardControlSystem } from "../board-control_new/useBoardControlSystem";
import { DragState } from "../board-control_new/pointer-control/dragState";
import { CardFlightState } from "../board-control_new/useCardFlight";

type MovingStackVisual = {
  baseLeft: number;
  baseTop: number;
  x: number;
  y: number;
  stack: Array<EngineCard>;
  durationMs?: number;
  mode: "drag" | "flight";
};

function getVisualFromDrag(drag: DragState): MovingStackVisual | null {
  if (!(drag.active || drag.pending || drag.isReturning)) return null;
  if (drag.stack.length === 0) return null;

  return {
    baseLeft: drag.baseLeft,
    baseTop: drag.baseTop,
    x: drag.x,
    y: drag.y,
    stack: drag.stack,
    mode: "drag"
  };
}

function getVisualFromCardFlight(
  cardFlight: CardFlightState
): MovingStackVisual | null {
  if (!cardFlight.active) return null;
  if (cardFlight.stack.length === 0) return null;

  return {
    baseLeft: cardFlight.baseLeft,
    baseTop: cardFlight.baseTop,
    x: cardFlight.x,
    y: cardFlight.y,
    stack: cardFlight.stack,
    durationMs: cardFlight.durationMs,
    mode: "flight"
  };
}

export default function DragLayer({
  boardController
}: {
  boardController: ReturnType<typeof useBoardControlSystem>;
}) {
  const { drag, resetDrag, cardFlight, clearCardFlight } = boardController;

  const visual = getVisualFromDrag(drag) ?? getVisualFromCardFlight(cardFlight);

  if (!visual) return null;

  return (
    <div
      className={`drag-layer ${
        drag.isReturning || visual.mode === "flight" ? "is-auto-moving" : ""
      } `}
      onTransitionEnd={() => {
        if (visual.mode === "drag" && drag.isReturning) {
          resetDrag();
        }

        if (visual.mode === "flight") {
          clearCardFlight();
        }
      }}
      style={{
        left: 0,
        top: 0,
        transform: `translate3d(${visual.baseLeft + visual.x}px, ${
          visual.baseTop + visual.y
        }px, 0)`,
        transitionDuration:
          visual.mode === "flight" && visual.durationMs != null
            ? `${visual.durationMs}ms`
            : undefined
      }}
      aria-hidden="true"
    >
      <div className="drag-layer__stack tableau-col">
        {visual.stack.map((card, i) => (
          <Card
            key={card.id}
            card={card}
            region="drag-layer"
            playable
            style={{ zIndex: i + 1 }}
          />
        ))}
      </div>
    </div>
  );
}
