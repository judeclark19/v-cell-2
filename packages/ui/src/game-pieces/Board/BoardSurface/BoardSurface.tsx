"use client";

import * as React from "react";
import { BoardSurfaceRoot } from "./BoardSurface.styles";

export type BoardSurfaceProps = React.HTMLAttributes<HTMLDivElement>;

export const BoardSurface = React.forwardRef<
  HTMLDivElement,
  BoardSurfaceProps
>(function BoardSurface({ children, ...props }, ref) {
  return (
    <BoardSurfaceRoot {...props} ref={ref}>
      {children}
    </BoardSurfaceRoot>
  );
});
