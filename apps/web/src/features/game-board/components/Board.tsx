import "../styles/board.css";
import { useGame } from "@/state/game/GameProvider";
import { BoardKbAttrsContext } from "@/features/game-board/keyboard/boardKbAttrs";
import { useBoardController } from "@/features/game-board/hooks/useBoardController";

import Tableau from "./Tableau";
import Foundations from "./Foundations";
import FreeCells from "./FreeCells";
import BoardModals from "./BoardModals";
import DragLayer from "./DragLayer";
import BoardControls from "./BoardControls";

function Board() {
  const game = useGame();
  const { kbCarrying, kbAttrsContextValue, boardRef, ...vm } =
    useBoardController(game);

  return (
    <>
      <div
        className={`board-border ${kbCarrying ? "is-kb-carrying" : ""}`}
        key={vm.seedReady ? vm.state.seed : "loading"}
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
            {vm.seedReady ? (
              <>
                {/* Foundations on top */}
                <Foundations
                  hasStarted={vm.hasStarted}
                  timeElapsedMs={vm.timeElapsedMs}
                  foundationCards={vm.foundationCards}
                  foundations={vm.state.foundations}
                  drag={vm.drag}
                  playableFoundations={vm.playable.foundations}
                  allowFoundationPullback={vm.allowFoundationPullback}
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
                  seedReady={vm.seedReady}
                  paused={vm.paused}
                  shouldShowWinModal={vm.shouldShowWinModal}
                  onCardPointerUp={vm.onCardPointerUp}
                />
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
            onNewDeal={vm.newDealWithCelebration}
          />
        </BoardKbAttrsContext.Provider>
      </div>

      <BoardControls
        seed={vm.state?.seed ?? "(unknown)"}
        onNewDeal={vm.newDealWithCelebration}
        onRestart={vm.restartWithCelebration}
        onUndo={vm.undo}
        canUndo={vm.canUndo}
        undoLimit={vm.undoLimit}
        undosRemaining={vm.undosRemaining}
      />
    </>
  );
}

export default Board;
