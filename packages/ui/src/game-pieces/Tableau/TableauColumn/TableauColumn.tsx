"use client";

import * as React from "react";
import {
  TableauColumnRoot,
  TableauEmptySlotRoot
} from "./TableauColumn.styles";

export type TableauColumnProps = React.HTMLAttributes<HTMLDivElement>;

export const TableauColumn = React.forwardRef<
  HTMLDivElement,
  TableauColumnProps
>(function TableauColumn({ children, ...props }, ref) {
  return (
    <TableauColumnRoot {...props} ref={ref}>
      {children}
    </TableauColumnRoot>
  );
});

export type TableauEmptySlotProps = React.HTMLAttributes<HTMLDivElement>;

export const TableauEmptySlot = React.forwardRef<
  HTMLDivElement,
  TableauEmptySlotProps
>(function TableauEmptySlot({ children, ...props }, ref) {
  return (
    <TableauEmptySlotRoot {...props} ref={ref}>
      {children}
    </TableauEmptySlotRoot>
  );
});
