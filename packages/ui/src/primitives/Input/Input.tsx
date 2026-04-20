"use client";

import * as React from "react";
import { InputRoot } from "./Input.styles";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  fullWidth?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ fullWidth = false, ...props }, ref) {
    return <InputRoot {...props} ref={ref} $fullWidth={fullWidth} />;
  }
);
