import { useGame } from "@/state/game/GameProvider";
import CardView from "./CardView";
import "./board.css";
import { getPlayableMask } from "@vcell/engine";
import { useMemo } from "react";

function Board() {
  const { state } = useGame();
  const playable = useMemo(() => getPlayableMask(state), [state]);
  console.log("Playable mask:", playable);

  const getTopFoundationCard = (i: number) => {
    const slot = state.foundations[i];
    return slot.cards.length ? slot.cards[slot.cards.length - 1] : null;
  };

  // `undefined` = padding (renders no slot), `null` = empty slot (renders a slot)
  const foundationsRow: Array<
    ReturnType<typeof getTopFoundationCard> | null | undefined
  > = [
    undefined,
    undefined,
    undefined,
    getTopFoundationCard(0) ?? null,
    getTopFoundationCard(1) ?? null,
    getTopFoundationCard(2) ?? null,
    getTopFoundationCard(3) ?? null
  ];

  const freeCellsRow: Array<
    (typeof state.freeCells)[number] | null | undefined
  > = [
    undefined,
    state.freeCells[0] ?? null,
    state.freeCells[1] ?? null,
    state.freeCells[2] ?? null,
    state.freeCells[3] ?? null,
    state.freeCells[4] ?? null,
    undefined
  ];

  return (
    <>
      <div className="board-border">
        <div className="board" aria-label="Game board">
          {/* Foundations on top */}
          <div className="board-top" aria-label="Foundations">
            <div className="pile-row" aria-label="Foundations">
              {foundationsRow.map((card, i) =>
                card === undefined ? (
                  <div key={i} className="pile-spacer" aria-hidden="true" />
                ) : (
                  <CardView key={i} card={card} />
                )
              )}
            </div>
          </div>

          {/* Tableau in the middle */}
          <div className="tableau" aria-label="Tableau">
            {state.tableau.map((col, colIndex) => (
              <div
                key={colIndex}
                className="tableau-col"
                aria-label={`Tableau column ${colIndex + 1}`}
              >
                {col.length === 0 ? (
                  <CardView card={null} />
                ) : (
                  col.map((tc) => (
                    <CardView
                      key={tc.card.id}
                      card={tc.card}
                      faceDown={tc.faceDown}
                      playable={playable.tableau[colIndex][col.indexOf(tc)]}
                    />
                  ))
                )}
              </div>
            ))}
          </div>

          {/* Free cells on bottom */}
          <div className="board-bottom" aria-label="Free cells">
            <div className="pile-row" aria-label="Free cells">
              {freeCellsRow.map((card, i) =>
                card === undefined ? (
                  <div key={i} className="pile-spacer" aria-hidden="true" />
                ) : (
                  <CardView key={i} card={card} />
                )
              )}
            </div>
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
