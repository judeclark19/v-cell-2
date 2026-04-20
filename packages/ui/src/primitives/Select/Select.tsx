"use client";

import * as React from "react";
import { SelectRoot } from "./Select.styles";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select(props, ref) {
    return <SelectRoot {...props} ref={ref} />;
  }
);
