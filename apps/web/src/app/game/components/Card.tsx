import type { Card } from "@vcell/engine";
import "./card.css";

function suitSymbol(suit: string, size: "small" | "large" = "large") {
  return (
    <img
      src={`/images/${suit}.svg`}
      alt={suit}
      className={`card-suit card-suit--${size}`}
      aria-hidden
    />
  );
}

function displayRank(rank: number) {
  switch (rank) {
    case 1:
      return "A";
    case 11:
      return "J";
    case 12:
      return "Q";
    case 13:
      return "K";
    default:
      return rank;
  }
}

function Card({
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
      className={`card ${faceDown ? "face-down" : ""} ${
        playable ? "is-playable" : "is-locked"
      } ${className}`.trim()}
      aria-label={faceDown ? "Face-down card" : `Card ${card.id}`}
      tabIndex={playable ? 0 : -1}
    >
      <div className="card-inner">
        {!faceDown && (
          <>
            <div className="card-front__top">
              {displayRank(card.rank)}
              {suitSymbol(card.suit, "small")}
            </div>

            <div className="card-front__main">
              {suitSymbol(card.suit, "large")}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Card;
