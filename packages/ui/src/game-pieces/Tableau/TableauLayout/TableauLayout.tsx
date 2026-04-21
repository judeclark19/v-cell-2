"use client";

import * as React from "react";
import { TableauGridRoot, TableauScrollRoot } from "./TableauLayout.styles";

export type TableauScrollProps = React.HTMLAttributes<HTMLDivElement>;

export const TableauScroll = React.forwardRef<
  HTMLDivElement,
  TableauScrollProps
>(function TableauScroll({ children, ...props }, ref) {
  return (
    <TableauScrollRoot {...props} ref={ref}>
      {children}
    </TableauScrollRoot>
  );
});

export type TableauGridProps = React.HTMLAttributes<HTMLDivElement>;

export const TableauGrid = React.forwardRef<HTMLDivElement, TableauGridProps>(
  function TableauGrid({ children, ...props }, ref) {
    return (
      <TableauGridRoot {...props} ref={ref}>
        {children}
      </TableauGridRoot>
    );
  }
);
