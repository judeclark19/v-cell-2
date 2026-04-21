"use client";

import * as React from "react";
import { BoardControlsRoot } from "./BoardControls.styles";

export type BoardControlsProps = React.HTMLAttributes<HTMLDivElement> & {
  keyboardCarrying?: boolean;
};

export const BoardControlsStyle = React.forwardRef<
  HTMLDivElement,
  BoardControlsProps
>(function BoardControls(
  { children, keyboardCarrying = false, ...props },
  ref
) {
  return (
    <BoardControlsRoot {...props} ref={ref}>
      {children}
    </BoardControlsRoot>
  );
});
