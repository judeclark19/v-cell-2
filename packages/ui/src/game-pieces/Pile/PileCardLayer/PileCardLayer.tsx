"use client";

import * as React from "react";
import { PileCardLayerRoot } from "./PileCardLayer.styles";

export type PileCardLayerProps = React.HTMLAttributes<HTMLDivElement>;

export const PileCardLayer = React.forwardRef<
  HTMLDivElement,
  PileCardLayerProps
>(function PileCardLayer({ children, ...props }, ref) {
  return (
    <PileCardLayerRoot {...props} ref={ref}>
      {children}
    </PileCardLayerRoot>
  );
});
