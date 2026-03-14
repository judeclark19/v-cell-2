import "../styles/board.css";
import { BoardKbAttrsContext } from "@/features/game-board/keyboard/boardKbAttrs";
import { useBoardController } from "@/features/game-board/hooks/useBoardController";

import Tableau from "../components/Tableau";
import Foundations from "../components/Foundations";
import FreeCells from "../components/FreeCells";
import BoardModals from "../components/BoardModals";
import DragLayer from "../components/DragLayer";
import BoardControls from "../components/BoardControls";
import SeedButton from "@/ui/SeedButton";
import { useSelector } from "react-redux";
import {
  selectSessionId,
  selectSessionPhase
} from "@/state/session/sessionSlice";

import {
  selectCanUndo,
  selectRules,
  selectSeed,
  selectUndosRemaining
} from "@/state/game/gameSlice";
import { useKeyboardControlSystem } from "../board-control/keyboard-control/useKeyboardControlSystem_new";
import { useRef } from "react";

function Board() {
  const boardRef = useRef<HTMLDivElement>(null);

  // Game state
  const seed = useSelector(selectSeed);
  const rules = useSelector(selectRules);
  const undosRemaining = useSelector(selectUndosRemaining);
  const canUndo = useSelector(selectCanUndo);
  // Session state
  const sessionPhase = useSelector(selectSessionPhase);
  const sessionId = useSelector(selectSessionId);

  const boardController = useKeyboardControlSystem();
  const { kbCarrying } = boardController;

  return (
    <>
      <div
        className={`board-border ${kbCarrying ? "is-kb-carrying" : ""}`}
        key={sessionPhase === "ready" ? seed : "loading"}
      >
        {/* <BoardKbAttrsContext.Provider value={kbAttrsContextValue}> */}
        <div
          className="board"
          aria-label="Game board"
          ref={boardRef}
          tabIndex={boardController.isInputSuppressed ? -1 : 0}
          onKeyDown={(e) => {
            if (boardController.isInputSuppressed) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            boardController.onKCSKeydown(e);
          }}
          onPointerDownCapture={boardController.onBoardPointerDownCapture}
          onFocusCapture={boardController.onBoardFocusCapture}
          onBlurCapture={boardController.onBoardBlurCapture}
          onFocus={boardController.onBoardFocus}
        >
          {sessionPhase === "ready" ? (
            <>
              {/* Foundations on top */}
              <Foundations boardController={boardController} />

              {/* Tableau in the middle */}
              <Tableau vm={boardController} />

              {/* Drag overlay layer */}
              <DragLayer
                drag={boardController.drag}
                resetDrag={boardController.resetDrag}
              />

              {/* Free cells on bottom */}
              <FreeCells vm={boardController} />
              <div
                className="row"
                style={{ marginTop: "1em", marginBottom: "0.5em" }}
              >
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={boardController.restartWithCelebration}
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

        <BoardModals vm={boardController} sessionId={sessionId} />
        {/* </BoardKbAttrsContext.Provider> */}
      </div>
      <p className="hint" style={{ textAlign: "center" }}>
        Current seed:{" "}
        {seed ? <SeedButton seed={seed ?? "(unknown)"} /> : "(unknown)"}
      </p>
      <BoardControls vm={boardController} />
    </>
  );
}

export default Board;
