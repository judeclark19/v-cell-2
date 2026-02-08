import { useEffect, useRef, useState } from "react";
import { startKbFlight as startKbFlightImpl } from "./kbFlight";
import { useDropTargetHover } from "./useDropTargetHover";
import { resolveDropTarget } from "./resolveDropTarget";
import { usePointerDragController } from "./usePointerDragController";
import {
  DragSource,
  DragState,
  DropTarget,
  UseCardDragOptions
} from "./dragTypes";
import { createPickupDragStart } from "./pickupDragStart";
import { useDragReset } from "./useDragReset";

/**
 * Owns drag state + global pointer listeners for picking up stacks from the tableau.
 * Board remains the orchestrator; this hook is the drag engine.
 */
export function useCardDrag<
  TCard extends { id: string | number },
  TState extends {
    tableau: Array<Array<{ card: TCard; faceDown: boolean }>>;
    freeCells: Array<TCard | null>;
    foundations: Array<{ cards: Array<TCard> }>;
  },
  TPlayable extends {
    tableau: Array<Array<boolean>>;
    freeCells: Array<boolean>;
  }
>(
  state: TState,
  playable: TPlayable,
  options?: UseCardDragOptions<{ card: TCard; faceDown: boolean }>
) {
  type TableauItem = TState["tableau"][number][number];

  const makeEmptyKbFlight = (): DragState<TableauItem>["kbFlight"] => ({
    active: false,
    cardIds: [],
    dropTarget: null
  });

  const emptyDrag = (): DragState<TableauItem> => ({
    active: false,
    isReturning: false,
    pending: false,
    pointerId: null,
    captureEl: null,
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
    baseLeft: 0,
    baseTop: 0,
    width: 0,
    height: 0,
    stack: [],
    source: null,
    kbFlight: makeEmptyKbFlight()
  });

  const [drag, setDrag] = useState<DragState<TableauItem>>(emptyDrag);

  const dragRef = useRef(drag);

  const dropHover = useDropTargetHover({
    enabled: drag.active || drag.pending,
    selectors: [".is-playable", ".card-slot"],
    className: "is-kb-drop-target"
  });

  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  const { releaseCapture, resetDrag } = useDragReset<TableauItem>({
    dragRef,
    setDrag,
    emptyDrag,
    dropHover
  });

  usePointerDragController<TableauItem>({
    active: drag.active,
    pending: drag.pending,
    dragRef,
    setDrag,
    dropHover,
    releaseCapture,
    resetDrag,
    resolveDropTarget: resolveDropTarget({
      getFoundations: options?.getFoundations,
      getFreeCells: options?.getFreeCells,
      getTableauCols: options?.getTableauCols
    }),
    onDrop: options?.onDrop
  });

  const {
    handleTableauPointerDown,
    handleFreeCellPointerDown,
    handleFoundationPointerDown
  } = createPickupDragStart<TCard, TableauItem, TState, TPlayable>({
    state,
    playable,
    allowFoundationPullback: options?.allowFoundationPullback !== false,
    makeEmptyKbFlight,
    setDrag
  });

  const startKbFlight = (args: {
    fromEl: HTMLElement;
    toEl: HTMLElement;
    stack: Array<TableauItem>;
    source: DragSource | null;
    dropTarget: DropTarget;
    durationMs?: number;
  }) => {
    startKbFlightImpl<TableauItem>({
      ...args,
      getCardId: (tc) => String(tc.card.id),
      setDrag,
      dragRef
    });
  };

  return {
    drag,
    setDrag,
    resetDrag,
    handleTableauPointerDown,
    handleFreeCellPointerDown,
    handleFoundationPointerDown,
    startKbFlight
  };
}
