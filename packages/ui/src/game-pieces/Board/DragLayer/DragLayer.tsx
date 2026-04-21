"use client";

import * as React from "react";
import { DragLayerRoot, DragLayerStackRoot } from "./DragLayer.styles";

export type DragLayerProps = React.HTMLAttributes<HTMLDivElement> & {
  autoMoving?: boolean;
};

export const BoardDragLayer = React.forwardRef<
  HTMLDivElement,
  DragLayerProps
>(function BoardDragLayer({ autoMoving = false, children, ...props }, ref) {
  return (
    <DragLayerRoot {...props} ref={ref} $autoMoving={autoMoving}>
      {children}
    </DragLayerRoot>
  );
});

export type DragLayerStackProps = React.HTMLAttributes<HTMLDivElement>;

export const BoardDragLayerStack = React.forwardRef<
  HTMLDivElement,
  DragLayerStackProps
>(function BoardDragLayerStack({ children, ...props }, ref) {
  return (
    <DragLayerStackRoot {...props} ref={ref}>
      {children}
    </DragLayerStackRoot>
  );
});
