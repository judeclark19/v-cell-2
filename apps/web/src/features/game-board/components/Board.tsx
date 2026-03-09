import "../styles/board.css";
import { useGame } from "@/state/game/GameProvider";
import { BoardKbAttrsContext } from "@/features/game-board/keyboard/boardKbAttrs";
import { useBoardController } from "@/features/game-board/hooks/useBoardController";
import { selectConfirmReq } from "@/state/ui/uiSlice";
import Tableau from "./Tableau";
import Foundations from "./Foundations";
import FreeCells from "./FreeCells";
import BoardModals from "./BoardModals";
import DragLayer from "./DragLayer";
import BoardControls from "./BoardControls";
import SeedButton from "@/ui/SeedButton";
import { useDispatch, useSelector } from "react-redux";
import {
  selectSessionPhase,
  selectStartedAtMs
} from "@/state/session/sessionSlice";
import { AppDispatch } from "@/state/reduxStore";
import { Rules } from "@vcell/engine";
import {
  selectCanUndo,
  selectRules,
  selectStatus,
  selectUndosRemaining
} from "@/state/game/gameSlice";
import { useSession } from "@/state/session/SessionProvider";
import {
  requestConfirmation,
  dismissConfirmation
} from "@/state/ui/requestConfirmation";
import { requestRulesChange as requestRulesChangeThunk } from "@/state/session/thunks/requestRulesChange";

function Board() {
  const dispatch = useDispatch<AppDispatch>();
  // Game state
  const rules = useSelector(selectRules);
  const undosRemaining = useSelector(selectUndosRemaining);
  const canUndo = useSelector(selectCanUndo);
  const status = useSelector(selectStatus);
  // Session state
  const startedAtMs = useSelector(selectStartedAtMs);
  const sessionPhase = useSelector(selectSessionPhase);
  const confirmReq = useSelector(selectConfirmReq);

  const { uid } = useSession();
  const game = useGame();
  const { kbCarrying, kbAttrsContextValue, boardRef, ...vm } =
    useBoardController(game);

  return (
    <>
      <div
        className={`board-border ${kbCarrying ? "is-kb-carrying" : ""}`}
        key={sessionPhase === "ready" ? vm.state.seed : "loading"}
      >
        <BoardKbAttrsContext.Provider value={kbAttrsContextValue}>
          <div
            className="board"
            aria-label="Game board"
            ref={boardRef}
            tabIndex={vm.isInputSuppressed ? -1 : 0}
            onKeyDown={(e) => {
              if (vm.isInputSuppressed) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              vm.onBoardKeyDown(e);
            }}
            onPointerDownCapture={vm.onBoardPointerDownCapture}
            onFocusCapture={vm.onBoardFocusCapture}
            onBlurCapture={vm.onBoardBlurCapture}
            onFocus={vm.onBoardFocus}
          >
            {sessionPhase === "ready" ? (
              <>
                {/* Foundations on top */}
                <Foundations
                  foundationCards={vm.foundationCards}
                  foundations={vm.state.foundations}
                  drag={vm.drag}
                  playableFoundations={vm.playable.foundations}
                  showTimer={vm.showTimer}
                  setFoundationRef={vm.setFoundationRef}
                  handleFoundationPointerDown={vm.handleFoundationPointerDown}
                  isAbandoned={false}
                />

                {/* Tableau in the middle */}
                <Tableau
                  state={vm.state}
                  playable={vm.playable}
                  drag={vm.drag}
                  handleTableauPointerDown={vm.handleTableauPointerDown}
                  tryAutoFoundationFromEl={vm.tryAutoFoundationFromEl}
                  setTableauColRef={vm.setTableauColRef}
                  tryAutoFreeCellFromEl={vm.tryAutoFreeCellFromEl}
                  onCardPointerUp={vm.onCardPointerUp}
                />

                {/* Drag overlay layer */}
                <DragLayer drag={vm.drag} resetDrag={vm.resetDrag} />

                {/* Free cells on bottom */}
                <FreeCells
                  freeCellsRow={vm.freeCellsRow}
                  playableFreeCells={vm.playable.freeCells}
                  tryAutoFoundationFromEl={vm.tryAutoFoundationFromEl}
                  setFreeCellRef={vm.setFreeCellRef}
                  drag={vm.drag}
                  handleFreeCellPointerDown={vm.handleFreeCellPointerDown}
                  showAcp={vm.showAcp}
                  isAutoCompleting={vm.isAutoCompleting}
                  runAutoComplete={vm.runAutoComplete}
                  stopAutoComplete={vm.stopAutoComplete}
                  onCardPointerUp={vm.onCardPointerUp}
                />
                <div
                  className="row"
                  style={{ marginTop: "1em", marginBottom: "0.5em" }}
                >
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={vm.restartWithCelebration}
                  >
                    Restart deal
                  </button>

                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={vm.undo}
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

          <BoardModals
            shouldShowWinModal={vm.shouldShowWinModal}
            onDismissWinModal={vm.dismissWinModal}
            moveCount={vm.moveCount}
            confirmReq={confirmReq}
            dismissConfirm={() => dismissConfirmation(dispatch, confirmReq)}
            onNewDealAction={vm.newDealWithCelebration}
          />
        </BoardKbAttrsContext.Provider>
      </div>
      <p className="hint" style={{ textAlign: "center" }}>
        Current seed:{" "}
        {vm.state?.seed ? (
          <SeedButton seed={vm.state?.seed ?? "(unknown)"} />
        ) : (
          "(unknown)"
        )}
      </p>
      <BoardControls
        onNewDeal={async () => {
          const ok =
            !(startedAtMs && status === "in_progress") ||
            (await requestConfirmation(dispatch, {
              title: "Start a new deal?",
              bodyText: "Starting a new deal will abandon your current game.",
              confirmLabel: "New deal",
              cancelLabel: "Cancel"
            }));
          if (!ok) return;

          vm.newDealWithCelebration();
        }}
        startBySeed={async (seed: string) => {
          const ok =
            !(startedAtMs && status === "in_progress") ||
            (await requestConfirmation(dispatch, {
              title: "Start a seeded deal?",
              bodyText:
                "Starting this seeded deal will abandon your current game.",
              confirmLabel: "Start",
              cancelLabel: "Cancel"
            }));
          if (!ok) return;

          vm.startBySeed(seed);
        }}
        requestRulesChange={async (patch: Rules) => {
          await dispatch(requestRulesChangeThunk({ patch, uid })).unwrap();
        }}
      />
    </>
  );
}

export default Board;
