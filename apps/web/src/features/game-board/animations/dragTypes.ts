export type DragSource =
  | {
      type: "tableau";
      colIndex: number;
      startIndex: number;
    }
  | {
      type: "freecell";
      index: number;
    }
  | {
      type: "foundation";
      index: number;
    };

export type DragState<TCardItem> = {
  active: boolean;
  isReturning: boolean;
  pending: boolean;
  pointerId: number | null;
  captureEl: HTMLDivElement | null;
  x: number;
  y: number;
  startX: number;
  startY: number;
  baseLeft: number;
  baseTop: number;
  width: number;
  height: number;
  stack: Array<TCardItem>;
  source: DragSource | null;
  kbFlight: {
    active: boolean;
    /** Card ids in the flying stack. Used by board regions to suppress destination duplicates. */
    cardIds: string[];
    /** Target pile for suppression. */
    dropTarget: DropTarget;
    /** Optional override for kb-flight transition duration (ms). */
    durationMs?: number;
  };
};

export type DropTarget =
  | { type: "tableau"; colIndex: number }
  | { type: "freecell"; index: number }
  | { type: "foundation"; index: number }
  | null;

export type UseCardDragOptions<TCardItem> = {
  allowFoundationPullback?: boolean;
  getTableauCols?: () => Array<HTMLElement | null>;
  getFreeCells?: () => Array<HTMLElement | null>;
  getFoundations?: () => Array<HTMLElement | null>;
  onDrop?: (args: {
    clientX: number;
    clientY: number;
    drag: DragState<TCardItem>;
    dropTarget: DropTarget;
  }) => boolean;
};
