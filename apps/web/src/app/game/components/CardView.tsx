import type { Card } from "@vcell/engine";
import "./card.css";

function CardView({
  card,
  faceDown = false,
  playable = false,
  className = ""
}: {
  card?: Card | null;
  faceDown?: boolean;
  playable?: boolean;
  className?: string;
}) {
  const isEmpty = !card;

  if (isEmpty) {
    return (
      <div className={`card-slot ${className}`.trim()} aria-hidden="true" />
    );
  }

  return (
    <div
      // className={`card ${faceDown ? "face-down" : ""} ${className}`.trim()}
      className={`card ${faceDown ? "face-down" : ""} ${
        playable ? "is-playable" : ""
      } ${className}`.trim()}
      aria-label={faceDown ? "Face-down card" : `Card ${card.id}`}
      tabIndex={0}
    >
      <div className="card-inner">{faceDown ? "🂠" : card.id}</div>
    </div>
  );
}

export default CardView;
