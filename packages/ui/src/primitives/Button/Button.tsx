"use client";

import * as React from "react";
import {
  ButtonRoot,
  type ButtonSize,
  type ButtonVariant
} from "./Button.styles";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  as?: React.ElementType;
  fullWidth?: boolean;
  href?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      fullWidth = false,
      size = "md",
      type = "button",
      variant = "primary",
      ...props
    },
    ref
  ) {
    return (
      <ButtonRoot
        {...props}
        ref={ref}
        $fullWidth={fullWidth}
        $size={size}
        $variant={variant}
        type={type}
      >
        {children}
      </ButtonRoot>
    );
  }
);
