import type { Card as EngineCard } from "@vcell/engine";
import Card from "../Card";

type FoundationsProps = {
  foundationsRow: Array<EngineCard | null | undefined>;
  playableFoundations: boolean[];
  showTimer: boolean;
  setFoundationRef: (index: number, el: HTMLDivElement | null) => void;
};

function Foundations({
  foundationsRow,
  playableFoundations,
  showTimer,
  setFoundationRef
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
            <div
              key={i}
              className="pile-cell"
              ref={(el) => setFoundationRef(i - 3, el)}
            >
              {/* Slot always visible */}
              <Card card={null} className="pile-slot" emptyLabel="A" />

              {/* Card layer (if present) */}
              {card && (
                <Card
                  card={card}
                  className="pile-card"
                  playable={playableFoundations[i - 3]} // -3 accounts for spacers
                />
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default Foundations;
