"use client";

import * as React from "react";
import { BoardTimerCellRoot, BoardTimerTextRoot } from "./BoardTimer.styles";

export type BoardTimerCellProps = React.HTMLAttributes<HTMLDivElement>;

export const BoardTimerCell = React.forwardRef<
  HTMLDivElement,
  BoardTimerCellProps
>(function BoardTimerCell({ children, ...props }, ref) {
  return (
    <BoardTimerCellRoot {...props} ref={ref}>
      {children}
    </BoardTimerCellRoot>
  );
});

export type BoardTimerTextProps = React.HTMLAttributes<HTMLDivElement> & {
  muted?: boolean;
};

export const BoardTimerText = React.forwardRef<
  HTMLDivElement,
  BoardTimerTextProps
>(function BoardTimerText({ children, muted = false, ...props }, ref) {
  return (
    <BoardTimerTextRoot {...props} ref={ref} $muted={muted}>
      {children}
    </BoardTimerTextRoot>
  );
});
