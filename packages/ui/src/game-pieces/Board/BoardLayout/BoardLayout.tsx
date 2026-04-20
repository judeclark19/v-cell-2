"use client";

import * as React from "react";
import { BoardLayoutRoot } from "./BoardLayout.styles";

export type BoardLayoutProps = React.HTMLAttributes<HTMLDivElement>;

export const BoardLayout = React.forwardRef<HTMLDivElement, BoardLayoutProps>(
  function BoardLayout({ children, ...props }, ref) {
    return (
      <BoardLayoutRoot {...props} ref={ref}>
        {children}
      </BoardLayoutRoot>
    );
  }
);
