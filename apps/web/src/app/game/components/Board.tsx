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
      <p>CONTROLS HERE!</p>
    </>
  );
}

export default Board;
