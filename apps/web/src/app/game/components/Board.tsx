import { useGame } from "@/state/game/GameProvider";
import Card from "./Card";
import "./board.css";
import { applyMove, getLegalMoves, getPlayableMask } from "@vcell/engine";
import type { PileRef } from "@vcell/engine";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function Board() {
  const { state, showTimer, dispatchMove, undo, canUndo } = useGame();
  const playable = useMemo(() => getPlayableMask(state), [state]);

  type Move = Parameters<typeof applyMove>[1];

  const legalMoves = useMemo(() => getLegalMoves(state), [state]);

  type DragSource = { type: "tableau"; colIndex: number; startIndex: number };
  type DragState = {
    active: boolean;
    pointerId: number | null;
    x: number;
    y: number;
    startX: number;
    startY: number;
    baseLeft: number;
    baseTop: number;
    width: number;
    height: number;
    stack: Array<(typeof state.tableau)[number][number]>;
    source: DragSource | null;
  };

  const [drag, setDrag] = useState<DragState>({
    active: false,
    pointerId: null,
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
    baseLeft: 0,
    baseTop: 0,
    width: 0,
    height: 0,
    stack: [],
    source: null
  });

  const dragRef = useRef(drag);
  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  const rafRef = useRef<number | null>(null);
  const latestXYRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const scheduleDragUpdate = () => {
    if (rafRef.current != null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const cur = dragRef.current;
      setDrag({ ...cur, x: latestXYRef.current.x, y: latestXYRef.current.y });
    });
  };

  const endDrag = () => {
    const cur = dragRef.current;
    if (!cur.active) return;
    setDrag({
      active: false,
      pointerId: null,
      x: 0,
      y: 0,
      startX: 0,
      startY: 0,
      baseLeft: 0,
      baseTop: 0,
      width: 0,
      height: 0,
      stack: [],
      source: null
    });
  };

  const onGlobalPointerMove = (e: PointerEvent) => {
    const cur = dragRef.current;
    if (!cur.active) return;
    if (cur.pointerId == null || e.pointerId !== cur.pointerId) return;
    latestXYRef.current = {
      x: e.clientX - cur.startX,
      y: e.clientY - cur.startY
    };
    scheduleDragUpdate();
  };

  const onGlobalPointerUp = (e: PointerEvent) => {
    const cur = dragRef.current;
    if (!cur.active) return;
    if (cur.pointerId == null || e.pointerId !== cur.pointerId) return;
    endDrag();
  };

  useEffect(() => {
    if (!drag.active) return;
    window.addEventListener("pointermove", onGlobalPointerMove);
    window.addEventListener("pointerup", onGlobalPointerUp);
    window.addEventListener("pointercancel", onGlobalPointerUp);
    return () => {
      window.removeEventListener("pointermove", onGlobalPointerMove);
      window.removeEventListener("pointerup", onGlobalPointerUp);
      window.removeEventListener("pointercancel", onGlobalPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag.active]);

  const computePickupRun = (colIndex: number, startIndex: number) => {
    const col = state.tableau[colIndex];
    const mask = playable.tableau[colIndex];
    let end = startIndex;
    while (end < col.length) {
      const tc = col[end];
      if (tc.faceDown) break;
      if (!mask[end]) break;
      end++;
    }
    return col.slice(startIndex, end);
  };

  const handleTableauPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    colIndex: number,
    tcIndex: number
  ) => {
    // Only primary button for mouse; touch/pen are fine.
    if (e.pointerType === "mouse" && (e as any).button !== 0) return;

    if (!playable.tableau[colIndex][tcIndex]) return;
    if (state.tableau[colIndex][tcIndex].faceDown) return;

    e.preventDefault();
    const el = e.currentTarget as HTMLDivElement;
    const rect = el.getBoundingClientRect();

    el.setPointerCapture(e.pointerId);

    const stack = computePickupRun(colIndex, tcIndex);

    setDrag({
      active: true,
      pointerId: e.pointerId,
      x: 0,
      y: 0,
      startX: e.clientX,
      startY: e.clientY,
      baseLeft: rect.left,
      baseTop: rect.top,
      width: rect.width,
      height: rect.height,
      stack,
      source: { type: "tableau", colIndex, startIndex: tcIndex }
    });
  };

  const getTopFoundationCard = (i: number) => {
    const slot = state.foundations[i];
    return slot.cards.length ? slot.cards[slot.cards.length - 1] : null;
  };

  const tryAutoFoundation = useCallback(
    (from: PileRef) => {
      const candidates = legalMoves.filter(
        (m): m is Extract<Move, { kind: "single" }> =>
          m.kind === "single" &&
          m.from.type === from.type &&
          m.to.type === "foundation" &&
          (m.from as any).index === (from as any).index
      );

      if (candidates.length === 0) return;

      // Choose deterministically: lowest foundation index.
      candidates.sort((a, b) => a.to.index - b.to.index);
      dispatchMove(candidates[0]);
    },
    [dispatchMove, legalMoves]
  );

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
                  <div
                    key={i}
                    className={`pile-spacer ${i === 1 ? "timer-cell" : ""}`}
                    aria-hidden={
                      i !== 1 ? "true" : showTimer ? "false" : "true"
                    }
                  >
                    {i === 1 && (
                      <>
                        <div className="timer">00:00</div>
                        <button className="btn btn--primary">⏸︎</button>
                      </>
                    )}
                  </div>
                ) : (
                  <Card
                    key={i}
                    card={card}
                    emptyLabel="A"
                    playable={playable.foundations[i - 3]} // -3 accounts for spacers
                  />
                )
              )}
            </div>
          </div>

          {/* Tableau in the middle */}
          <div className="tableau-scroll" aria-label="Tableau">
            <div className="tableau" aria-label="Tableau grid">
              {state.tableau.map((col, colIndex) => (
                <div
                  key={colIndex}
                  className="tableau-col"
                  aria-label={`Tableau column ${colIndex + 1}`}
                >
                  {col.length === 0 ? (
                    <Card card={null} emptyLabel="K" />
                  ) : (
                    col.map((tc, tcIndex) => {
                      const isDraggedFromThisCol =
                        drag.active &&
                        drag.source?.type === "tableau" &&
                        drag.source.colIndex === colIndex;

                      const inDraggedRange =
                        isDraggedFromThisCol &&
                        drag.source != null &&
                        tcIndex >= drag.source.startIndex &&
                        tcIndex < drag.source.startIndex + drag.stack.length;

                      if (inDraggedRange) {
                        return (
                          <Card
                            key={tc.card.id}
                            card={tc.card}
                            faceDown={tc.faceDown}
                            playable={playable.tableau[colIndex][tcIndex]}
                            disableInternalDrag
                            className="card--ghost"
                            style={{ visibility: "hidden" }}
                          />
                        );
                      }

                      return (
                        <Card
                          key={tc.card.id}
                          card={tc.card}
                          faceDown={tc.faceDown}
                          playable={playable.tableau[colIndex][tcIndex]}
                          style={{ zIndex: tcIndex + 1 }}
                          onActivate={() =>
                            tryAutoFoundation({
                              type: "tableau",
                              index: colIndex as any
                            })
                          }
                          onPointerDownCard={(e) =>
                            handleTableauPointerDown(e, colIndex, tcIndex)
                          }
                          disableInternalDrag
                        />
                      );
                    })
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Drag overlay layer */}
          {drag.active && drag.stack.length > 0 && (
            <div
              className="drag-layer"
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
          <div className="board-bottom" aria-label="Free cells">
            <div className="pile-row" aria-label="Free cells">
              {freeCellsRow.map((card, i) =>
                card === undefined ? (
                  <div key={i} className="pile-spacer" aria-hidden="true" />
                ) : (
                  <div key={i} className="pile-cell">
                    {/* Always show the slot */}
                    <Card card={null} className="pile-slot" />

                    {/* If a card exists, render it on top of the slot */}
                    {card && (
                      <Card
                        card={card}
                        playable={playable.freeCells[i - 1]} // -1 accounts for spacer
                        className="pile-card"
                        onActivate={() =>
                          tryAutoFoundation({
                            type: "freecell",
                            index: (i - 1) as any
                          })
                        }
                      />
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="control" aria-label="Game actions">
        <div className="row">
          <button type="button" className="btn btn--primary" disabled>
            New deal
          </button>
          <button type="button" className="btn btn--secondary" disabled>
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
      </section>
    </>
  );
}

export default Board;
