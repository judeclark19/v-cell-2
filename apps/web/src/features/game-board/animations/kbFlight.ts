import type { DragSource, DragState, DropTarget } from "./dragTypes";

export function startKbFlight<TCardItem>(args: {
  fromEl: HTMLElement;
  toEl: HTMLElement;
  stack: Array<TCardItem>;
  getCardId: (item: TCardItem) => string;
  source: DragSource | null;
  dropTarget: DropTarget;
  durationMs?: number;

  setDrag: React.Dispatch<React.SetStateAction<DragState<TCardItem>>>;
  dragRef: React.RefObject<DragState<TCardItem>>;
}) {
  const {
    fromEl,
    toEl,
    stack,
    getCardId,
    source,
    dropTarget,
    durationMs,
    setDrag,
    dragRef
  } = args;

  const fromRect = fromEl.getBoundingClientRect();
  const toRect = toEl.getBoundingClientRect();

  // Start a visual-only drag at the source location.
  // We set `isReturning: true` so DragLayer transition-end can finalize it.
  setDrag({
    active: true,
    isReturning: true,
    pending: false,
    pointerId: null,
    captureEl: null,
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
    baseLeft: fromRect.left,
    baseTop: fromRect.top,
    width: fromRect.width,
    height: fromRect.height,
    stack,
    source,
    kbFlight: {
      active: true,
      cardIds: stack.map(getCardId),
      dropTarget,
      durationMs
    }
  });

  // Animate to the destination on the next frame so CSS transition can run.
  window.requestAnimationFrame(() => {
    const cur = dragRef.current;
    if (!cur.active) return;
    if (!cur.kbFlight.active) return;

    const dx = toRect.left - fromRect.left;
    const dy = toRect.top - fromRect.top;

    setDrag({ ...cur, x: dx, y: dy });
  });
}
