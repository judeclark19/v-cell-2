"use client";

import * as React from "react";
import { AutocompleteDrawerRoot } from "./AutocompleteDrawer.styles";

export type AutocompleteDrawerProps = React.HTMLAttributes<HTMLDivElement> & {
  visible?: boolean;
};

export const AutocompleteDrawer = React.forwardRef<
  HTMLDivElement,
  AutocompleteDrawerProps
>(function AutocompleteDrawer({ children, visible = false, ...props }, ref) {
  return (
    <AutocompleteDrawerRoot {...props} ref={ref} $visible={visible}>
      {children}
    </AutocompleteDrawerRoot>
  );
});
