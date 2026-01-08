import { getLegalMoves, getPlayableMask } from "@vcell/engine";
import type { Card as EngineCard } from "@vcell/engine";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "@/state/game/GameProvider";
import Card from "../Card";
import "./board.css";
import { useCardDrag } from "@/ui/useCardDrag";
import type { DragSource, DropTarget } from "@/ui/useCardDrag";
import Tableau from "./Tableau";
import Foundations from "./Foundations";
import FreeCells from "./FreeCells";
import PauseOverlay from "./PauseOverlay";
import { commitBoardDrop, useBoardDrop } from "./useBoardDrop";
import { useAutoFoundation } from "./useAutoFoundation";

function WinAlertEffect({ isWon }: { isWon: boolean }) {
  const hasAlertedWinRef = useRef(false);

  useEffect(() => {
    if (isWon) {
      if (!hasAlertedWinRef.current) {
        hasAlertedWinRef.current = true;
        window.alert("You won!");
      }
    } else {
      // Reset between deals / restarts.
      hasAlertedWinRef.current = false;
    }
  }, [isWon]);

  return null;
}

type BoardStateShape = {
  foundations: Array<{ cards: EngineCard[] }>;
  freeCells: Array<EngineCard | null>;
};

function buildFoundationsRow(
  state: BoardStateShape
): Array<EngineCard | null | undefined> {
  const top = (i: number) => {
    const slot = state.foundations[i];
    return slot.cards.length ? slot.cards[slot.cards.length - 1] : null;
  };

  // `undefined` = padding (renders no slot), `null` = empty slot (renders a slot)
  return [
    undefined,
    undefined,
    undefined,
    top(0) ?? null,
    top(1) ?? null,
    top(2) ?? null,
    top(3) ?? null
  ];
}

function buildFreeCellsRow(
  state: BoardStateShape
): Array<EngineCard | null | undefined> {
  return [
    undefined,
    state.freeCells[0] ?? null,
    state.freeCells[1] ?? null,
    state.freeCells[2] ?? null,
    state.freeCells[3] ?? null,
    state.freeCells[4] ?? null,
    undefined
  ];
}

function Board() {
  const {
    state,
    isWon,
    showTimer,
    paused,
    setPaused,
    allowFoundationPullback,
    dispatchMove,
    undo,
    canUndo,
    newDeal,
    restart
  } = useGame();
  const playable = useMemo(() => getPlayableMask(state), [state]);

  const legalMoves = useMemo(() => getLegalMoves(state), [state]);

  const onDrop = useBoardDrop({ legalMoves, dispatchMove });
  const tryAutoFoundation = useAutoFoundation({ legalMoves, dispatchMove });

  const tableauColRefs = useRef<Array<HTMLDivElement | null>>([]);
  const setTableauColRef = useCallback(
    (colIndex: number, el: HTMLDivElement | null) => {
      tableauColRefs.current[colIndex] = el;
    },
    []
  );

  const freeCellRefs = useRef<Array<HTMLDivElement | null>>([]);
  const setFreeCellRef = useCallback(
    (index: number, el: HTMLDivElement | null) => {
      freeCellRefs.current[index] = el;
    },
    []
  );

  const foundationRefs = useRef<Array<HTMLDivElement | null>>([]);
  const setFoundationRef = useCallback(
    (index: number, el: HTMLDivElement | null) => {
      foundationRefs.current[index] = el;
    },
    []
  );

  const {
    drag,
    finalizeDrag,
    handleTableauPointerDown,
    handleFreeCellPointerDown,
    handleFoundationPointerDown
  } = useCardDrag(state, playable, {
    allowFoundationPullback,
    getTableauCols: () => tableauColRefs.current,
    getFreeCells: () => freeCellRefs.current,
    getFoundations: () => foundationRefs.current,
    onDrop
  });

  const foundationsRow = buildFoundationsRow(state);
  const freeCellsRow = buildFreeCellsRow(state);

  // ---------------------------------------------------------------------------
  // Keyboard navigation (roving tabindex + spatial arrow navigation)
  // Only playable items are focusable.
  // ---------------------------------------------------------------------------

  const boardRef = useRef<HTMLDivElement | null>(null);
  const focusablesRef = useRef<HTMLElement[]>([]);
  const [activeFocusIndex, setActiveFocusIndex] = useState(0);
  const hadBoardFocusRef = useRef(false);
  const lastFocusPointRef = useRef<{ x: number; y: number } | null>(null);
  const [kbCarrying, setKbCarrying] = useState(false);
  const kbCarriedElRef = useRef<HTMLElement | null>(null);
  const kbDropTargetElRef = useRef<HTMLElement | null>(null);

  const refreshKeyboardFocusables = useCallback(() => {
    const root = boardRef.current;
    if (!root) return;

    // Keyboard focusables:
    // - playable cards (".card.is-playable")
    // - while carrying (Space-toggle), also allow explicit empty slots opted in via
    //   data-kb-focusable="true" (e.g., empty drop targets)
    const selector = kbCarrying
      ? '.card.is-playable, [data-kb-focusable="true"]'
      : ".card.is-playable";

    const els = Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
      (el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-disabled")
    );

    focusablesRef.current = els;

    // Clamp the active index to the new list.
    setActiveFocusIndex((prev) => {
      if (els.length === 0) return 0;
      return Math.min(prev, els.length - 1);
    });
  }, [kbCarrying]);

  const focusByIndex = useCallback((idx: number) => {
    const els = focusablesRef.current;
    if (!els.length) return;
    const next = els[Math.max(0, Math.min(idx, els.length - 1))];
    if (!next) return;
    next.focus();
  }, []);

  const getCenter = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  const clearKbCarryVisuals = useCallback(() => {
    if (kbCarriedElRef.current) {
      kbCarriedElRef.current.classList.remove(
        "is-kb-carried",
        "is-kb-carried-stack"
      );
      kbCarriedElRef.current = null;
    }
    if (kbDropTargetElRef.current) {
      kbDropTargetElRef.current.classList.remove("is-kb-drop-target");
      kbDropTargetElRef.current = null;
    }
  }, []);

  const getCardIdFromEl = (el: HTMLElement): string | null => {
    const dataId = el.getAttribute("data-card-id") || el.dataset.cardId;
    if (dataId) return dataId;

    const aria = el.getAttribute("aria-label") || "";
    // Card.tsx renders aria-label like: "Card <id>" or "Card <id>, face down"
    if (aria.startsWith("Card ")) {
      const rest = aria.slice(5);
      const id = rest.split(",")[0]?.trim();
      return id || null;
    }

    return null;
  };

  const findTableauSourceForEl = (
    el: HTMLElement
  ): { colIndex: number; startIndex: number } | null => {
    // Prefer DOM containment via the column refs we already maintain.
    for (
      let colIndex = 0;
      colIndex < tableauColRefs.current.length;
      colIndex++
    ) {
      const colEl = tableauColRefs.current[colIndex];
      if (!colEl) continue;
      if (!colEl.contains(el)) continue;

      const cardId = getCardIdFromEl(el);
      if (!cardId) return null;

      const col = (state as any).tableau?.[colIndex] as
        | Array<{ card: EngineCard; faceDown: boolean }>
        | undefined;
      if (!col) return null;

      const startIndex = col.findIndex((tc) => tc.card.id === cardId);
      if (startIndex < 0) return null;

      return { colIndex, startIndex };
    }

    return null;
  };

  const findFreeCellIndexForEl = (el: HTMLElement): number | null => {
    for (let i = 0; i < freeCellRefs.current.length; i++) {
      const slotEl = freeCellRefs.current[i];
      if (!slotEl) continue;
      if (slotEl.contains(el) || slotEl === el) return i;
    }
    return null;
  };

  const findFoundationIndexForEl = (el: HTMLElement): number | null => {
    for (let i = 0; i < foundationRefs.current.length; i++) {
      const slotEl = foundationRefs.current[i];
      if (!slotEl) continue;
      if (slotEl.contains(el) || slotEl === el) return i;
    }
    return null;
  };

  const buildKbDragFromEl = (
    el: HTMLElement
  ): {
    source: DragSource;
    stack: Array<{ card: EngineCard; faceDown: boolean }>;
  } | null => {
    // tableau (supports stacks)
    const t = findTableauSourceForEl(el);
    if (t) {
      const col = (state as any).tableau?.[t.colIndex] as
        | Array<{ card: EngineCard; faceDown: boolean }>
        | undefined;
      if (!col) return null;
      const stack = col.slice(t.startIndex);
      return {
        source: {
          type: "tableau",
          colIndex: t.colIndex,
          startIndex: t.startIndex
        },
        stack
      };
    }

    // freecell (single)
    const freeIndex = findFreeCellIndexForEl(el);
    if (freeIndex != null) {
      const card = state.freeCells[freeIndex];
      if (!card) return null;
      return {
        source: { type: "freecell", index: freeIndex },
        stack: [{ card, faceDown: false }]
      };
    }

    // foundation (single)
    const fIndex = findFoundationIndexForEl(el);
    if (fIndex != null) {
      const pile = state.foundations[fIndex];
      const card = pile?.cards?.[pile.cards.length - 1] ?? null;
      if (!card) return null;
      return {
        source: { type: "foundation", index: fIndex },
        stack: [{ card, faceDown: false }]
      };
    }

    return null;
  };

  const buildKbDropTargetFromEl = (el: HTMLElement): DropTarget | null => {
    // Tableau target: any element inside a tableau column counts as that column.
    for (
      let colIndex = 0;
      colIndex < tableauColRefs.current.length;
      colIndex++
    ) {
      const colEl = tableauColRefs.current[colIndex];
      if (!colEl) continue;
      if (colEl.contains(el) || colEl === el) {
        return { type: "tableau", colIndex };
      }
    }

    // Freecell slot target
    const freeIndex = findFreeCellIndexForEl(el);
    if (freeIndex != null) return { type: "freecell", index: freeIndex };

    // Foundation slot target
    const fIndex = findFoundationIndexForEl(el);
    if (fIndex != null) return { type: "foundation", index: fIndex };

    return null;
  };

  const tryCommitKeyboardDrop = useCallback(() => {
    const carriedEl = kbCarriedElRef.current;
    if (!carriedEl) return false;

    const targetEl =
      kbDropTargetElRef.current ||
      (document.activeElement as HTMLElement | null);
    if (!targetEl) return false;

    const dragLike = buildKbDragFromEl(carriedEl);
    if (!dragLike) return false;

    const dropTarget = buildKbDropTargetFromEl(targetEl);
    if (!dropTarget) return false;

    return commitBoardDrop({
      drag: { source: dragLike.source, stack: dragLike.stack },
      dropTarget,
      legalMoves,
      dispatchMove
    });
  }, [dispatchMove, legalMoves]);

  const focusNearestToLastPoint = useCallback(() => {
    const els = focusablesRef.current;
    const p = lastFocusPointRef.current;
    if (!els.length || !p) return;

    let bestIdx = 0;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let i = 0; i < els.length; i++) {
      const c = getCenter(els[i]);
      const dx = Math.abs(c.x - p.x);
      const dy = Math.abs(c.y - p.y);

      // Strongly prefer staying in the same column (x alignment), then nearest y.
      const score = dx * 1000 + dy;
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    setActiveFocusIndex(bestIdx);
    requestAnimationFrame(() => focusByIndex(bestIdx));
  }, [focusByIndex]);

  // Keep the focusable list in sync with state changes.
  useEffect(() => {
    refreshKeyboardFocusables();

    // If a move removed the focused element (common when pressing Enter on a card),
    // restore focus to the next available playable card.
    // Because we keep a roving index, the same index will typically point at the
    // card that was "behind" the removed card after the DOM updates.
    const root = boardRef.current;
    const els = focusablesRef.current;
    if (!root || els.length === 0) return;

    const activeEl = document.activeElement as HTMLElement | null;
    const focusIsOnPlayable = !!(activeEl && els.includes(activeEl));

    if (hadBoardFocusRef.current && !focusIsOnPlayable) {
      // Prefer the next focusable that occupies the same visual column
      // as the card that was just removed.
      focusNearestToLastPoint();
    }
  }, [
    refreshKeyboardFocusables,
    state,
    playable,
    activeFocusIndex,
    focusNearestToLastPoint
  ]);

  // Apply roving tabindex based on activeFocusIndex.
  useEffect(() => {
    const els = focusablesRef.current;
    if (els.length === 0) return;

    els.forEach((el, i) => {
      el.tabIndex = i === activeFocusIndex ? 0 : -1;
    });
  }, [activeFocusIndex]);

  useEffect(() => {
    const root = boardRef.current;
    if (!root) return;

    if (!kbCarrying) {
      clearKbCarryVisuals();
      return;
    }

    // Entering carry mode: pick up the currently focused playable card (if any).
    const activeEl = document.activeElement as HTMLElement | null;
    const isPlayableCard = !!(
      activeEl &&
      activeEl.classList.contains("card") &&
      activeEl.classList.contains("is-playable")
    );

    if (isPlayableCard) {
      kbCarriedElRef.current = activeEl;
      activeEl.classList.add("is-kb-carried");
    }

    // While carrying, highlight the current focus as a drop target (unless it's the carried card).
    if (activeEl && activeEl !== kbCarriedElRef.current) {
      kbDropTargetElRef.current?.classList.remove("is-kb-drop-target");
      kbDropTargetElRef.current = activeEl;
      activeEl.classList.add("is-kb-drop-target");
    }
  }, [kbCarrying, clearKbCarryVisuals]);

  const findNextByDirection = useCallback(
    (dir: "left" | "right" | "up" | "down") => {
      const els = focusablesRef.current;
      if (!els.length) return;

      const activeEl = document.activeElement as HTMLElement | null;
      const fromEl =
        (activeEl && els.includes(activeEl) && activeEl) ||
        els[activeFocusIndex];
      if (!fromEl) return;

      const from = getCenter(fromEl);

      // Score candidates based on direction: prefer nearest in that direction,
      // with a bias toward staying aligned on the perpendicular axis.
      let bestIdx = -1;
      let bestScore = Number.POSITIVE_INFINITY;

      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        if (el === fromEl) continue;

        const to = getCenter(el);
        const dx = to.x - from.x;
        const dy = to.y - from.y;

        const isInDir =
          (dir === "left" && dx < -1) ||
          (dir === "right" && dx > 1) ||
          (dir === "up" && dy < -1) ||
          (dir === "down" && dy > 1);

        if (!isInDir) continue;

        // For L/R: move to the nearest item in the next column (minimize |dx| first),
        // then use |dy| as a tiebreaker.
        // For U/D: prefer staying in the same column (x alignment) first (minimize |dx|),
        // then move by y (|dy|).
        const primary = Math.abs(dx);
        const secondary = Math.abs(dy);

        // Strongly prefer closer primary movement; secondary is a tie-breaker.
        const score = primary * 1000 + secondary;
        if (score < bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }

      if (bestIdx >= 0) {
        setActiveFocusIndex(bestIdx);
        // Focus will move immediately; tabindex effect keeps it consistent.
        requestAnimationFrame(() => focusByIndex(bestIdx));
      }
    },
    [activeFocusIndex, focusByIndex]
  );

  const onBoardKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Space toggles keyboard "carry" mode.
      // When turning carry OFF, attempt to commit a move to the current target.
      if (e.key === " ") {
        e.preventDefault();

        setKbCarrying((v) => {
          if (v) {
            // Attempt drop
            const didMove = tryCommitKeyboardDrop();
            // Regardless of success, leaving carry mode clears visuals.
            // (If move failed, user can toggle carry again and try a new target.)
            clearKbCarryVisuals();
            return false;
          }

          // Enter carry mode
          return true;
        });
        return;
      }

      // While carrying, Enter commits the drop (same as Space to drop).
      if (e.key === "Enter" && kbCarrying) {
        e.preventDefault();
        const didMove = tryCommitKeyboardDrop();
        setKbCarrying(false);
        clearKbCarryVisuals();
        return;
      }

      if (e.key === "Escape") {
        setKbCarrying(false);
        clearKbCarryVisuals();
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        findNextByDirection("left");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        findNextByDirection("right");
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        findNextByDirection("up");
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        findNextByDirection("down");
      }
    },
    [
      findNextByDirection,
      clearKbCarryVisuals,
      kbCarrying,
      tryCommitKeyboardDrop
    ]
  );

  const onBoardFocusCapture = useCallback(() => {
    // When keyboard focus enters the board and nothing inside is focused,
    // focus the current active element.
    const els = focusablesRef.current;
    if (!els.length) return;

    const activeEl = document.activeElement as HTMLElement | null;
    if (activeEl && els.includes(activeEl)) return;

    requestAnimationFrame(() => focusByIndex(activeFocusIndex));
  }, [activeFocusIndex, focusByIndex]);

  return (
    <>
      <WinAlertEffect isWon={isWon} />
      <div
        className={`board-border ${kbCarrying ? "is-kb-carrying" : ""}`}
        key={state.seed}
      >
        <div
          className="board"
          aria-label="Game board"
          ref={boardRef}
          onKeyDown={onBoardKeyDown}
          onFocusCapture={(e) => {
            hadBoardFocusRef.current = true;
            onBoardFocusCapture();
          }}
          onBlurCapture={(e) => {
            const root = boardRef.current;
            // If focus is leaving the board entirely, clear the flag.
            if (root && !root.contains(e.relatedTarget as Node | null)) {
              hadBoardFocusRef.current = false;
              setKbCarrying(false);
              clearKbCarryVisuals();
            }
          }}
          onFocus={(e) => {
            const els = focusablesRef.current;
            const target = e.target as HTMLElement;
            const idx = els.indexOf(target);
            if (idx >= 0) {
              setActiveFocusIndex(idx);
              lastFocusPointRef.current = getCenter(target);

              // While keyboard-carrying, treat the focused element as the current drop target,
              // except when it's the carried source.
              if (kbCarrying) {
                if (
                  kbDropTargetElRef.current &&
                  kbDropTargetElRef.current !== target
                ) {
                  kbDropTargetElRef.current.classList.remove(
                    "is-kb-drop-target"
                  );
                }

                if (target !== kbCarriedElRef.current) {
                  kbDropTargetElRef.current = target;
                  target.classList.add("is-kb-drop-target");
                } else {
                  kbDropTargetElRef.current = null;
                }
              }
            }
          }}
        >
          {/* Foundations on top */}
          <Foundations
            foundationsRow={foundationsRow}
            foundations={state.foundations}
            drag={drag}
            playableFoundations={playable.foundations}
            allowFoundationPullback={allowFoundationPullback}
            showTimer={showTimer}
            setFoundationRef={setFoundationRef}
            handleFoundationPointerDown={handleFoundationPointerDown}
            onPause={() => setPaused(true)}
          />

          {/* Tableau in the middle */}
          <Tableau
            state={state}
            playable={playable}
            drag={drag}
            handleTableauPointerDown={handleTableauPointerDown}
            tryAutoFoundation={tryAutoFoundation}
            setTableauColRef={setTableauColRef}
          />

          {/* Drag overlay layer */}
          {(drag.active || drag.pending) && drag.stack.length > 0 && (
            <div
              className={`drag-layer ${drag.isReturning ? "is-returning" : ""}`}
              onTransitionEnd={() => {
                if (drag.isReturning) finalizeDrag();
              }}
              style={{
                left: 0,
                top: 0,
                transform: `translate3d(${drag.baseLeft + drag.x}px, ${
                  drag.baseTop + drag.y
                }px, 0)`
              }}
              aria-hidden="true"
            >
              <div className="drag-layer__stack tableau-col">
                {drag.stack.map((tc, i) => (
                  <Card
                    key={tc.card.id}
                    card={tc.card}
                    faceDown={tc.faceDown}
                    playable
                    disableInternalDrag
                    // Ensure the stack keeps its normal spacing
                    style={{ zIndex: i + 1 }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Free cells on bottom */}
          <FreeCells
            freeCellsRow={freeCellsRow}
            playableFreeCells={playable.freeCells}
            tryAutoFoundation={tryAutoFoundation}
            setFreeCellRef={setFreeCellRef}
            drag={drag}
            handleFreeCellPointerDown={handleFreeCellPointerDown}
          />
        </div>
        {paused && <PauseOverlay onClose={() => setPaused(false)} />}
      </div>

      <section className="control" aria-label="Game actions">
        <div className="row">
          <button type="button" className="btn btn--primary" onClick={newDeal}>
            New deal
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={restart}
          >
            Restart deal
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={undo}
            disabled={!canUndo}
          >
            Undo
          </button>
        </div>

        <p className="hint" style={{ textAlign: "center" }}>
          Seed: {state?.seed ?? "(unknown)"}
        </p>
      </section>
    </>
  );
}

export default Board;
