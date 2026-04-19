"use client";

import * as React from "react";
import { PanelRoot, type PanelPadding } from "./Panel.styles";

export type PanelProps = React.HTMLAttributes<HTMLElement> & {
  as?: React.ElementType;
  fullWidth?: boolean;
  maxWidth?: number | string;
  padding?: PanelPadding;
};

export const Panel = React.forwardRef<HTMLElement, PanelProps>(function Panel(
  {
    as,
    children,
    fullWidth = false,
    maxWidth,
    padding = "none",
    ...props
  },
  ref
) {
  return (
    <PanelRoot
      {...props}
      as={as}
      ref={ref}
      $fullWidth={fullWidth}
      $maxWidth={maxWidth}
      $padding={padding}
    >
      {children}
    </PanelRoot>
  );
});
