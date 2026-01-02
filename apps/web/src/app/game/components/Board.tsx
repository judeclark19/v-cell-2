import { useGame } from "@/state/game/GameProvider";
import CardView from "./CardView";
import "./board.css";

function Board() {
  const { state } = useGame();

  return (
    <>
      <div className="board-border">
        <div className="board" aria-label="Game board">
          <div className="tableau">
            {state.tableau.map((col, colIndex) => (
              <div
                key={colIndex}
                className="tableau-col"
                aria-label={`Tableau column ${colIndex + 1}`}
              >
                {col.length === 0 ? (
                  <div className="card-slot" aria-hidden="true" />
                ) : (
                  col.map((tc) => <CardView key={tc.card.id} />)
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <section className="control" aria-label="Game actions">
        <div className="row">
          <button type="button" className="btn btn--primary" disabled>
            Restart deal (same seed)
          </button>
          <button type="button" className="btn btn--primary" disabled>
            New deal (new seed)
          </button>
          <button type="button" className="btn btn--secondary" disabled>
            Abandon current game
          </button>
        </div>
        <p className="hint">
          Wiring next: hook these to GameProvider (restart/newSeed/abandon) and
          stats.
        </p>
      </section>
    </>
  );
}

export default Board;
