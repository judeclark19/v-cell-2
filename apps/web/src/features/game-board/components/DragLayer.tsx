import { Card as EngineCard } from "@vcell/engine";
import Card from "./Card";

type DragLayerProps = {
  drag: {
    active: boolean;
    pending: boolean;
    isReturning: boolean;
    stack: Array<{ card: { id: string }; faceDown?: boolean }>;
    baseLeft: number;
    baseTop: number;
    x: number;
    y: number;
    kbFlight?: {
      active: boolean;
      durationMs?: number;
    };
  };
  finalizeDrag: () => void;
};

export default function DragLayer({ drag, finalizeDrag }: DragLayerProps) {
  if (!(drag.active || drag.pending) || drag.stack.length === 0) return null;

  return (
    <div
      className={`drag-layer ${drag.isReturning ? "is-returning" : ""} ${
        drag.kbFlight?.active ? "is-kb-flight" : ""
      }`}
      onTransitionEnd={() => {
        if (drag.isReturning || drag.kbFlight?.active) finalizeDrag();
      }}
      style={{
        left: 0,
        top: 0,
        transform: `translate3d(${drag.baseLeft + drag.x}px, ${
          drag.baseTop + drag.y
        }px, 0)`,
        transitionDuration:
          drag.kbFlight?.active && drag.kbFlight.durationMs != null
            ? `${drag.kbFlight.durationMs}ms`
            : undefined
      }}
      aria-hidden="true"
    >
      <div className="drag-layer__stack tableau-col">
        {drag.stack.map((tc, i) => (
          <Card
            key={tc.card.id}
            card={tc.card as EngineCard}
            faceDown={tc.faceDown}
            playable
            style={{ zIndex: i + 1 }}
          />
        ))}
      </div>
    </div>
  );
}
