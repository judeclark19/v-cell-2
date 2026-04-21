import Tableau from "../components/Tableau";
import Foundations from "../components/Foundations";
import FreeCells from "../components/FreeCells";
import BoardModals from "../components/BoardModals";
import DragLayer from "../components/DragLayer";
import BoardControls from "../components/BoardControls";
import SeedButton from "@/ui/SeedButton";
import { useSelector } from "react-redux";
import { BoardBorder, BoardSurface } from "@vcell/ui";
import { selectSessionPhase } from "@/state/session/sessionSlice";

import { selectSeed } from "@/state/game/gameSlice";
import { useRef } from "react";
import { useBoardControlSystem } from "../board-control/useBoardControlSystem";

function Board() {
  // Board controller (new!)
  const boardRef = useRef<HTMLDivElement>(null);
  const boardController = useBoardControlSystem(boardRef);

  // Game state
  const seed = useSelector(selectSeed);

  // Session state
  const sessionPhase = useSelector(selectSessionPhase);

  return (
    <>
      <BoardBorder
        keyboardCarrying={boardController.kbState.carrying}
        key={sessionPhase === "ready" ? seed : "loading"}
        data-carrying-label={`Carrying the ${boardController.kbState.carryingLabel} — choose a target:`}
      >
        <BoardSurface
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
            </>
          ) : (
            <div className="board-loading" aria-label="Loading deal" />
          )}
        </BoardSurface>

        <BoardModals />
      </BoardBorder>
      <p className="hint" style={{ marginTop: "1rem", textAlign: "center" }}>
        Current seed:{" "}
        {seed ? <SeedButton seed={seed ?? "(unknown)"} /> : "(unknown)"}
      </p>
      <BoardControls boardController={boardController} />
    </>
  );
}

export default Board;
