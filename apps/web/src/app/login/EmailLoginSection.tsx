import Link from "next/link";
import { FormEvent } from "react";

type EmailLoginSectionProps = {
  nextPath: string;
  isOffline: boolean;
  loginEmail: string;
  loginPassword: string;
  loginLoading: boolean;
  loginError: string | null;
  canSubmitLogin: boolean;
  onLoginEmailChange: (value: string) => void;
  onLoginPasswordChange: (value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void | Promise<void>;
};

export function EmailLoginSection({
  nextPath,
  isOffline,
  loginEmail,
  loginPassword,
  loginLoading,
  loginError,
  canSubmitLogin,
  onLoginEmailChange,
  onLoginPasswordChange,
  onSubmit
}: EmailLoginSectionProps) {
  return (
    <div style={{ flex: 1 }}>
      <form onSubmit={onSubmit} style={{ maxWidth: 520 }}>
        <h2 style={{ marginBottom: 8, fontSize: 18 }}>Log in with email</h2>
        <p style={{ marginBottom: 12, opacity: 0.8 }}>
          Existing user? Log in with email + password.
        </p>

        <label style={{ display: "block", marginBottom: 10 }}>
          <span style={{ display: "block", marginBottom: 6 }}>Email</span>
          <input
            value={loginEmail}
            onChange={(e) => onLoginEmailChange(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            className="control"
            type="email"
            disabled={isOffline}
          />
        </label>

        <label style={{ display: "block", marginBottom: 14 }}>
          <span style={{ display: "block", marginBottom: 6 }}>Password</span>
          <input
            value={loginPassword}
            onChange={(e) => onLoginPasswordChange(e.target.value)}
            autoComplete="current-password"
            placeholder="Your password"
            className="control"
            type="password"
            disabled={isOffline}
          />
        </label>

        {loginError && (
          <p role="alert" style={{ marginBottom: 12 }}>
            {loginError}
          </p>
        )}

        <button
          type="submit"
          className="btn btn--primary"
          disabled={isOffline || !canSubmitLogin || loginLoading}
        >
          {loginLoading ? "Logging in…" : "Log in"}
        </button>
        <div style={{ marginTop: 10 }}>
          <Link
            href={`/forgot-password?next=${encodeURIComponent(nextPath)}`}
            style={{ textDecoration: "underline", fontSize: 14 }}
          >
            Forgot password?
          </Link>
        </div>
      </form>
    </div>
  );
}
