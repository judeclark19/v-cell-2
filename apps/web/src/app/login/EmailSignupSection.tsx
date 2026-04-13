import { FormEvent } from "react";

type EmailSignupSectionProps = {
  isOffline: boolean;
  signupDisplayName: string;
  signupEmail: string;
  signupPassword: string;
  signupLoading: boolean;
  signupError: string | null;
  canSubmitSignup: boolean;
  onSignupDisplayNameChange: (value: string) => void;
  onSignupEmailChange: (value: string) => void;
  onSignupPasswordChange: (value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void | Promise<void>;
};

export function EmailSignupSection({
  isOffline,
  signupDisplayName,
  signupEmail,
  signupPassword,
  signupLoading,
  signupError,
  canSubmitSignup,
  onSignupDisplayNameChange,
  onSignupEmailChange,
  onSignupPasswordChange,
  onSubmit
}: EmailSignupSectionProps) {
  return (
    <section>
      <h2 style={{ marginBottom: 8, fontSize: 18 }}>Sign up with email</h2>
      <p style={{ marginBottom: 12, opacity: 0.8 }}>
        Create an account with email/password.
      </p>
      <form onSubmit={onSubmit} style={{ maxWidth: 520 }}>
        <label style={{ display: "block", marginBottom: 10 }}>
          <span style={{ display: "block", marginBottom: 6 }}>
            Display name
          </span>
          <input
            value={signupDisplayName}
            onChange={(e) => onSignupDisplayNameChange(e.target.value)}
            autoComplete="nickname"
            placeholder="e.g., Jude"
            className="control"
            type="text"
            disabled={isOffline}
          />
        </label>

        <label style={{ display: "block", marginBottom: 10 }}>
          <span style={{ display: "block", marginBottom: 6 }}>Email</span>
          <input
            value={signupEmail}
            onChange={(e) => onSignupEmailChange(e.target.value)}
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
            value={signupPassword}
            onChange={(e) => onSignupPasswordChange(e.target.value)}
            autoComplete="new-password"
            placeholder="6+ characters"
            className="control"
            type="password"
            disabled={isOffline}
          />
        </label>

        {signupError && (
          <p role="alert" style={{ marginBottom: 12 }}>
            {signupError}
          </p>
        )}

        <button
          type="submit"
          className="btn btn--primary"
          disabled={isOffline || !canSubmitSignup || signupLoading}
        >
          {signupLoading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </section>
  );
}
