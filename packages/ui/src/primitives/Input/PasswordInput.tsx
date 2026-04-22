"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  PasswordInputField,
  PasswordInputRoot,
  PasswordVisibilityButton
} from "./Input.styles";
import type { InputProps } from "./Input";

export type PasswordInputProps = Omit<InputProps, "type"> & {
  hideLabel?: string;
  showLabel?: string;
};

export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  PasswordInputProps
>(function PasswordInput(
  {
    disabled,
    fullWidth = false,
    hideLabel = "Hide password",
    showLabel = "Show password",
    ...props
  },
  ref
) {
  const [visible, setVisible] = React.useState(false);
  const label = visible ? hideLabel : showLabel;
  const Icon = visible ? EyeOff : Eye;

  return (
    <PasswordInputRoot $fullWidth={fullWidth}>
      <PasswordInputField
        {...props}
        ref={ref}
        $fullWidth
        disabled={disabled}
        type={visible ? "text" : "password"}
      />
      <PasswordVisibilityButton
        type="button"
        aria-label={label}
        title={label}
        disabled={disabled}
        onClick={() => setVisible((current) => !current)}
      >
        <Icon aria-hidden="true" size={18} strokeWidth={2} />
      </PasswordVisibilityButton>
    </PasswordInputRoot>
  );
});
