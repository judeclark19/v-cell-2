import { useState } from "react";
import "../styles/board.css";
import { useGame } from "@/state/game/GameProvider";
import { BoardKbAttrsContext } from "@/features/game-board/keyboard/boardKbAttrs";
import { useBoardController } from "@/features/game-board/hooks/useBoardController";

import Tableau from "./Tableau";
import Foundations from "./Foundations";
import FreeCells from "./FreeCells";
import BoardModals, { type ConfirmRequest } from "./BoardModals";
import DragLayer from "./DragLayer";
import BoardControls from "./BoardControls";
import SeedButton from "@/ui/SeedButton";
import { useDispatch, useSelector } from "react-redux";
import {
  applyRulesChangeStartNewDeal,
  selectStartedAtMs
} from "@/state/session";
import { AppDispatch } from "@/state/reduxStore";
import { FaceDownCount, UndoLimit } from "@vcell/engine";
import {
  selectCanUndo,
  selectRules,
  selectUndosRemaining,
  selectUndosUsed
} from "@/state/game";

function Board() {
  const dispatch = useDispatch<AppDispatch>();
  const startedAtMs = useSelector(selectStartedAtMs);
  const rules = useSelector(selectRules);
  const undosUsed = useSelector(selectUndosUsed);
  const undosRemaining = useSelector(selectUndosRemaining);
  const canUndo = useSelector(selectCanUndo);

  const game = useGame();
  const { kbCarrying, kbAttrsContextValue, boardRef, ...vm } =
    useBoardController(game);

  // TODO: move this?
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);

  const confirmThen = (
    req: Omit<ConfirmRequest, "onConfirm">,
    onConfirm: () => void
  ) => {
    setConfirmReq({ ...req, onConfirm });
  };

  const dismissConfirm = () => {
    confirmReq?.onCancel?.();
    setConfirmReq(null);
  };

  const requestConfirm = (req: Omit<ConfirmRequest, "onConfirm">) => {
    return new Promise<boolean>((resolve) => {
      setConfirmReq({
        ...req,
        onConfirm: () => {
          resolve(true);
          setConfirmReq(null);
        },
        // IMPORTANT: this assumes BoardModals calls dismissConfirm() on cancel.
        // We'll wire that up in step 2.
        onCancel: () => {
          resolve(false);
          setConfirmReq(null);
        }
      });
    });
  };

  const confirmIfInProgress = (
    req: Omit<ConfirmRequest, "onConfirm">,
    onConfirm: () => void
  ) => {
    // Only confirm if a game is actually in progress (i.e. started and not finished).
    // When no progress exists, just do the action.
    if (!startedAtMs || (startedAtMs && vm.isWon)) {
      onConfirm();
      return;
    }
    confirmThen(req, () => {
      setConfirmReq(null);
      onConfirm();
    });
  };

  // TODO: move this?
  const requestRulesChange = async (patch: {
    faceDownCount?: FaceDownCount;
    undoLimit?: UndoLimit;
    allowFoundationPullback?: boolean;
  }) => {
    const ok = await requestConfirm({
      title: "Change gameplay setting?",
      bodyText:
        "Changing this will start a new game and abandon your current one.",
      confirmLabel: "Change",
      cancelLabel: "Cancel"
    });
    if (!ok) return;
    dispatch(applyRulesChangeStartNewDeal({ patch }));
  };

  return (
    <>
      <div
        className={`board-border ${kbCarrying ? "is-kb-carrying" : ""}`}
        key={game.sessionReady ? vm.state.seed : "loading"}
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
            {game.sessionReady ? (
              <>
                {/* Foundations on top */}
                <Foundations
                  timeElapsedMs={vm.timeElapsedMs}
                  foundationCards={vm.foundationCards}
                  foundations={vm.state.foundations}
                  drag={vm.drag}
                  playableFoundations={vm.playable.foundations}
                  showTimer={vm.showTimer}
                  setFoundationRef={vm.setFoundationRef}
                  handleFoundationPointerDown={vm.handleFoundationPointerDown}
                  onPause={() => vm.setPaused(true)}
                  isWon={vm.isWon}
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
                  isWon={vm.isWon}
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
            paused={vm.paused}
            onResume={() => vm.setPaused(false)}
            shouldShowWinModal={vm.shouldShowWinModal}
            onDismissWinModal={vm.dismissWinModal}
            moveCount={vm.moveCount}
            timeElapsedMs={vm.timeElapsedMs}
            confirmReq={confirmReq}
            dismissConfirm={dismissConfirm}
            requestConfirm={confirmThen}
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
        onNewDeal={() =>
          confirmIfInProgress(
            {
              title: "Start a new deal?",
              bodyText: "Starting a new deal will abandon your current game.",
              confirmLabel: "New deal",
              cancelLabel: "Cancel"
            },
            vm.newDealWithCelebration
          )
        }
        startBySeed={(seed) =>
          confirmIfInProgress(
            {
              title: "Start a new game from seed?",
              bodyText: "Starting a new deal will abandon your current game.",
              confirmLabel: "Play seed",
              cancelLabel: "Cancel"
            },
            () => vm.startBySeed(seed)
          )
        }
        requestRulesChange={requestRulesChange}
      />
    </>
  );
}

export default Board;
