"use client";

import * as React from "react";
import { BoardBottomRoot, BoardTopRoot } from "./BoardSection.styles";

export type BoardSectionProps = React.HTMLAttributes<HTMLDivElement>;

export const BoardTop = React.forwardRef<HTMLDivElement, BoardSectionProps>(
  function BoardTop({ children, ...props }, ref) {
    return (
      <BoardTopRoot {...props} ref={ref}>
        {children}
      </BoardTopRoot>
    );
  }
);

export const BoardBottom = React.forwardRef<HTMLDivElement, BoardSectionProps>(
  function BoardBottom({ children, ...props }, ref) {
    return (
      <BoardBottomRoot {...props} ref={ref}>
        {children}
      </BoardBottomRoot>
    );
  }
);
