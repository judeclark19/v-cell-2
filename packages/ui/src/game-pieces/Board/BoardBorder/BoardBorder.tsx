"use client";

import * as React from "react";
import { BoardBorderRoot } from "./BoardBorder.styles";

export type BoardBorderProps = React.HTMLAttributes<HTMLDivElement> & {
  keyboardCarrying?: boolean;
};

export const BoardBorder = React.forwardRef<HTMLDivElement, BoardBorderProps>(
  function BoardBorder(
    { children, keyboardCarrying = false, ...props },
    ref
  ) {
    return (
      <BoardBorderRoot
        {...props}
        ref={ref}
        $keyboardCarrying={keyboardCarrying}
      >
        {children}
      </BoardBorderRoot>
    );
  }
);
