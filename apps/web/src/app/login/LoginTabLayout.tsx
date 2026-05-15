import type React from "react";
import Or from "@/ui/Or";
import {
  Input,
  PasswordInput,
  type InputProps
} from "@vcell/ui";

export function AuthField({
  label,
  marginBottom,
  password = false,
  ...inputProps
}: InputProps & {
  label: React.ReactNode;
  marginBottom?: number;
  password?: boolean;
}) {
  const Control = password ? PasswordInput : Input;

  return (
    <label style={{ display: "block", marginBottom: marginBottom ?? 10 }}>
      <span style={{ display: "block", marginBottom: 6 }}>{label}</span>
      <Control {...inputProps} fullWidth />
    </label>
  );
}

export function LoginTabLayout({
  children,
  error,
  footer,
  googleButton,
  intro,
  maxFormWidth,
  onSubmit,
  submit
}: {
  children: React.ReactNode;
  error?: React.ReactNode;
  footer?: React.ReactNode;
  googleButton: React.ReactNode;
  intro: React.ReactNode;
  maxFormWidth?: number;
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
  submit: React.ReactNode;
}) {
  return (
    <section>
      {intro}
      {googleButton}
      <Or />
      <form
        onSubmit={onSubmit}
        style={maxFormWidth == null ? undefined : { maxWidth: maxFormWidth }}
      >
        {children}
        {error}
        {submit}
      </form>
      {footer == null ? null : (
        <div
          style={{
            marginTop: 10,
            textAlign: "center"
          }}
        >
          {footer}
        </div>
      )}
    </section>
  );
}
