import "../styles/board.css";

import Tableau from "../components/Tableau";
import Foundations from "../components/Foundations";
import FreeCells from "../components/FreeCells";
import BoardModals from "../components/BoardModals";
import DragLayer from "../components/DragLayer";
import BoardControls from "../components/BoardControls";
import SeedButton from "@/ui/SeedButton";
import { useSelector } from "react-redux";
import { selectSessionPhase } from "@/state/session/sessionSlice";

import {
  selectCanUndo,
  selectRules,
  selectSeed,
  selectUndosRemaining
} from "@/state/game/gameSlice";
import { useRef } from "react";
import { useBoardControlSystem } from "../board-control/useBoardControlSystem";

function Board() {
  // Board controller (new!)
  const boardRef = useRef<HTMLDivElement>(null);
  const boardController = useBoardControlSystem(boardRef);

  // Game state
  const seed = useSelector(selectSeed);
  const rules = useSelector(selectRules);
  const undosRemaining = useSelector(selectUndosRemaining);
  const canUndo = useSelector(selectCanUndo);
  // Session state
  const sessionPhase = useSelector(selectSessionPhase);

  return (
    <div className="board-layout">
      <div className="board-layout__board-pane">
        <div
          className={`board-border ${boardController.kbState.carrying ? "is-kb-carrying" : ""}`}
          key={sessionPhase === "ready" ? seed : "loading"}
          data-carrying-label={`Carrying the ${boardController.kbState.carryingLabel} — choose a target:`}
        >
          <div
            className="board"
            aria-label="Game board"
            ref={boardRef}
            tabIndex={boardController.isInputSuppressed ? -1 : 0}
            onPointerDownCapture={boardController.onKCSPointerDown}
            onFocusCapture={boardController.onKCSFocusCapture}
            onBlurCapture={boardController.onKCSBlurCapture}
            onFocus={boardController.onKCSFocus}
          >
            {sessionPhase === "ready" ? (
              <>
                {/* Foundations on top */}
                <Foundations boardController={boardController} />

                {/* Tableau in the middle */}
                <Tableau boardController={boardController} />

                {/* Drag overlay layer */}
                <DragLayer boardController={boardController} />

                {/* Free cells on bottom */}
                <FreeCells boardController={boardController} />
                <div
                  className="row"
                  style={{ marginTop: "1em", marginBottom: "0.5em" }}
                >
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={boardController.restartDeal}
                  >
                    Restart deal
                  </button>

                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={boardController.undo}
                    disabled={!canUndo}
                  >
                    {rules.undoLimit === "unlimited" || rules.undoLimit === 0
                      ? "Undo"
                      : `Undo (${undosRemaining})`}
                  </button>
                </div>
              </>
            ) : (
              <div className="board-loading" aria-label="Loading deal" />
            )}
          </div>

          <BoardModals />
        </div>
        <p className="hint" style={{ marginTop: "1rem", textAlign: "center" }}>
          Current seed:{" "}
          {seed ? <SeedButton seed={seed ?? "(unknown)"} /> : "(unknown)"}
        </p>
      </div>

      <div className="board-layout__controls-pane">
        <BoardControls boardController={boardController} />
      </div>
    </div>
  );
}

export default Board;
