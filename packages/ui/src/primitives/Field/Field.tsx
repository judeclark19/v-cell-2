"use client";

import * as React from "react";
import { FieldHint, FieldLabel, FieldRoot } from "./Field.styles";

export type FieldProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  hint?: React.ReactNode;
  label?: React.ReactNode;
};

export function Field({
  children,
  hint,
  label,
  ...props
}: FieldProps) {
  return (
    <FieldRoot {...props}>
      {label == null ? null : <FieldLabel>{label}</FieldLabel>}
      {children}
      {hint == null ? null : <FieldHint>{hint}</FieldHint>}
    </FieldRoot>
  );
}
