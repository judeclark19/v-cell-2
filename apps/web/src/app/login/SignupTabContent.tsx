import { Button } from "@vcell/ui";
import Or from "@/ui/Or";
import GSIMaterialButton from "./GSIMaterialButton";
import { useLoginAuthFlows } from "./useLoginAuthFlows";

type SignupTabContentProps = {
  isOffline: boolean;
  authFlows: ReturnType<typeof useLoginAuthFlows>;
};

export function SignupTabContent({
  isOffline,
  authFlows
}: SignupTabContentProps) {
  const {
    signupDisplayName,
    signupEmail,
    signupPassword,
    signupLoading,
    signupError,
    canSubmitSignup,
    setSignupDisplayName,
    setSignupEmail,
    setSignupPassword,
    signupWithEmail,
    loginAndContinue
  } = authFlows;

  const onSignupDisplayNameChange = setSignupDisplayName;
  const onSignupEmailChange = setSignupEmail;
  const onSignupPasswordChange = setSignupPassword;
  const onSubmit = signupWithEmail;

  return (
    <section>
      <p style={{ marginBottom: 36 }}>
        Create an account to unlock your stats, leaderboard, and sync across
        devices.
      </p>
      <GSIMaterialButton inOrUp="up" onClick={loginAndContinue} />
      <Or />

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
            className="control full-width"
            type="text"
            disabled={isOffline}
            name="displayName"
          />
        </label>

        <label style={{ display: "block", marginBottom: 10 }}>
          <span style={{ display: "block", marginBottom: 6 }}>Email</span>
          <input
            value={signupEmail}
            onChange={(e) => onSignupEmailChange(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            className="control full-width"
            type="email"
            disabled={isOffline}
            name="email"
          />
        </label>

        <label style={{ display: "block", marginBottom: 14 }}>
          <span style={{ display: "block", marginBottom: 6 }}>Password</span>
          <input
            value={signupPassword}
            onChange={(e) => onSignupPasswordChange(e.target.value)}
            autoComplete="new-password"
            placeholder="6+ characters"
            className="control full-width"
            type="password"
            disabled={isOffline}
            name="password"
          />
        </label>

        {signupError && (
          <p role="alert" style={{ marginBottom: 12 }}>
            {signupError}
          </p>
        )}

        <Button
          type="submit"
          fullWidth
          disabled={isOffline || !canSubmitSignup || signupLoading}
        >
          {signupLoading ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </section>
  );
}
