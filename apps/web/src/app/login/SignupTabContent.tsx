import { Button } from "@vcell/ui";
import GSIMaterialButton from "./GSIMaterialButton";
import { useLoginAuthFlows } from "./useLoginAuthFlows";
import { AuthField, LoginTabLayout } from "./LoginTabLayout";

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
    <LoginTabLayout
      intro={
        <p style={{ marginBottom: 36 }}>
          Create an account to unlock your stats, leaderboard, and sync across
          devices.
        </p>
      }
      googleButton={<GSIMaterialButton inOrUp="up" onClick={loginAndContinue} />}
      maxFormWidth={520}
      onSubmit={onSubmit}
      error={
        signupError ? (
          <p role="alert" style={{ marginBottom: 12 }}>
            {signupError}
          </p>
        ) : null
      }
      submit={
        <Button
          type="submit"
          fullWidth
          disabled={isOffline || !canSubmitSignup || signupLoading}
        >
          {signupLoading ? "Creating account…" : "Create account"}
        </Button>
      }
    >
      <AuthField
        label="Display name"
        value={signupDisplayName}
        onChange={(e) => onSignupDisplayNameChange(e.target.value)}
        autoComplete="nickname"
        placeholder="e.g., Jude"
        type="text"
        disabled={isOffline}
        name="displayName"
      />

      <AuthField
        label="Email"
        value={signupEmail}
        onChange={(e) => onSignupEmailChange(e.target.value)}
        autoComplete="email"
        placeholder="you@example.com"
        type="email"
        disabled={isOffline}
        name="email"
      />

      <AuthField
        label="Password"
        marginBottom={14}
        password
        value={signupPassword}
        onChange={(e) => onSignupPasswordChange(e.target.value)}
        autoComplete="new-password"
        placeholder="6+ characters"
        disabled={isOffline}
        name="password"
      />
    </LoginTabLayout>
  );
}
