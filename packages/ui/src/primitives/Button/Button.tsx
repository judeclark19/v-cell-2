"use client";

import * as React from "react";
import { ButtonRoot, type ButtonVariant } from "./Button.styles";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  as?: React.ElementType;
  fullWidth?: boolean;
  href?: string;
  variant?: ButtonVariant;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      active = false,
      children,
      fullWidth = false,
      type = "button",
      variant = "primary",
      ...props
    },
    ref
  ) {
    return (
      <ButtonRoot
        {...props}
        $active={active}
        ref={ref}
        $fullWidth={fullWidth}
        $variant={variant}
        type={type}
      >
        {children}
      </ButtonRoot>
    );
  }
);
