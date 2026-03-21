import type { Card } from "@vcell/engine";
import type { BoardSource } from "../useBoardControlSystem_new";

export type DragState = {
  active: boolean;
  pending: boolean;
  isReturning: boolean;
  captureEl: HTMLDivElement | null;
  source: BoardSource | null;
  stack: Array<{ card: Card; faceDown: boolean }>;
  baseLeft: number;
  baseTop: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  pointerId: number | null;
};

export const emptyDragState = (): DragState => ({
  active: false,
  pending: false,
  isReturning: false,
  captureEl: null,
  source: null,
  stack: [],
  baseLeft: 0,
  baseTop: 0,
  x: 0,
  y: 0,
  startX: 0,
  startY: 0,
  pointerId: null
});
