import "../styles/board.css";
import { useGame } from "@/state/game/GameProvider";
import { BoardKbAttrsContext } from "@/features/game-board/keyboard/boardKbAttrs";
import { useBoardController } from "@/features/game-board/hooks/useBoardController";
import {
  openConfirm,
  closeConfirm,
  selectConfirmReq
} from "@/state/ui/uiSlice";
import Tableau from "./Tableau";
import Foundations from "./Foundations";
import FreeCells from "./FreeCells";
import BoardModals from "./BoardModals";
import DragLayer from "./DragLayer";
import BoardControls from "./BoardControls";
import SeedButton from "@/ui/SeedButton";
import { useDispatch, useSelector } from "react-redux";
import { applyRulesChangeStartNewDeal } from "@/state/session/thunks/applyRulesChange_startNewDeal";
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

function Board() {
  const dispatch = useDispatch<AppDispatch>();
  const startedAtMs = useSelector(selectStartedAtMs);
  const rules = useSelector(selectRules);
  const undosRemaining = useSelector(selectUndosRemaining);
  const canUndo = useSelector(selectCanUndo);
  const status = useSelector(selectStatus);
  const sessionPhase = useSelector(selectSessionPhase);

  const { uid } = useSession();
  const game = useGame();
  const { kbCarrying, kbAttrsContextValue, boardRef, ...vm } =
    useBoardController(game);

  // TODO: move this?
  const confirmReq = useSelector(selectConfirmReq);

  const dismissConfirm = () => {
    confirmReq?.onCancel?.();
    dispatch(closeConfirm());
  };

  const confirmIfInProgress = (req: {
    title: string;
    bodyText: string;
    confirmLabel?: string;
    cancelLabel?: string;
  }) => {
    if (!(startedAtMs && status === "in_progress")) {
      return Promise.resolve(true);
    }

    return new Promise<boolean>((resolve) => {
      dispatch(
        openConfirm({
          ...req,
          onConfirm: () => {
            resolve(true);
            dispatch(closeConfirm());
          },
          onCancel: () => {
            resolve(false);
          }
        })
      );
    });
  };

  // TODO: move this?
  function areRulesEqual(a: Rules, b: Rules): boolean {
    return (
      a.allowFoundationPullback === b.allowFoundationPullback &&
      a.undoLimit === b.undoLimit &&
      a.faceDownCount === b.faceDownCount
    );
  }
  const requestRulesChange = async (patch: Rules) => {
    const newRules = { ...rules, ...patch };
    if (areRulesEqual(rules, newRules)) return;

    const ok = await confirmIfInProgress({
      title: "Change gameplay setting?",
      bodyText:
        "Changing this will start a new game and abandon your current one.",
      confirmLabel: "Change",
      cancelLabel: "Cancel"
    });
    if (!ok) return;

    dispatch(
      applyRulesChangeStartNewDeal({
        newRules,
        uid
      })
    );
  };
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
            dismissConfirm={dismissConfirm}
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
          const ok = await confirmIfInProgress({
            title: "Start a new deal?",
            bodyText: "Starting a new deal will abandon your current game.",
            confirmLabel: "New deal",
            cancelLabel: "Cancel"
          });
          if (!ok) return;

          vm.newDealWithCelebration();
        }}
        startBySeed={async (seed: string) => {
          const ok = await confirmIfInProgress({
            title: "Start a seeded deal?",
            bodyText:
              "Starting this seeded deal will abandon your current game.",
            confirmLabel: "Start",
            cancelLabel: "Cancel"
          });
          if (!ok) return;

          vm.startBySeed(seed);
        }}
        requestRulesChange={requestRulesChange}
      />
    </>
  );
}

export default Board;
