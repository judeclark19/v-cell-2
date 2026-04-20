"use client";

import * as React from "react";
import { PileCellRoot, PileSpacerRoot } from "./PileCell.styles";

export type PileCellProps = React.HTMLAttributes<HTMLDivElement>;

export const PileCell = React.forwardRef<HTMLDivElement, PileCellProps>(
  function PileCell({ children, ...props }, ref) {
    return (
      <PileCellRoot {...props} ref={ref}>
        {children}
      </PileCellRoot>
    );
  }
);

export type PileSpacerProps = React.HTMLAttributes<HTMLDivElement>;

export const PileSpacer = React.forwardRef<HTMLDivElement, PileSpacerProps>(
  function PileSpacer({ children, ...props }, ref) {
    return (
      <PileSpacerRoot {...props} ref={ref}>
        {children}
      </PileSpacerRoot>
    );
  }
);
