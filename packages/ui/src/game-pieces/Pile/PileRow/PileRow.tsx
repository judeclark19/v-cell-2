"use client";

import * as React from "react";
import { PileRowRoot } from "./PileRow.styles";

export type PileRowProps = React.HTMLAttributes<HTMLDivElement>;

export const PileRow = React.forwardRef<HTMLDivElement, PileRowProps>(
  function PileRow({ children, ...props }, ref) {
    return (
      <PileRowRoot {...props} ref={ref}>
        {children}
      </PileRowRoot>
    );
  }
);
