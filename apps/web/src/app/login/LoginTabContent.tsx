import Link from "next/link";
import { Button } from "@vcell/ui";
import GSIMaterialButton from "./GSIMaterialButton";
import { useLoginAuthFlows } from "./useLoginAuthFlows";
import { AuthField, LoginTabLayout } from "./LoginTabLayout";

type LoginTabContentProps = {
  nextPath: string;
  isOffline: boolean;
  authFlows: ReturnType<typeof useLoginAuthFlows>;
};

export function LoginTabContent({
  nextPath,
  isOffline,
  authFlows
}: LoginTabContentProps) {
  const {
    loginEmail,
    loginPassword,
    loginLoading,
    loginError,
    canSubmitLogin,
    setLoginEmail,
    setLoginPassword,
    loginWithEmail,
    loginAndContinue
  } = authFlows;
  const onLoginPasswordChange = setLoginPassword;
  const onLoginEmailChange = setLoginEmail;
  const onSubmit = loginWithEmail;
  return (
    <LoginTabLayout
      intro={
        <p style={{ marginBottom: 36 }}>
          Existing user? Sign in to unlock your stats, leaderboard, and sync
          across devices.
        </p>
      }
      googleButton={<GSIMaterialButton inOrUp="in" onClick={loginAndContinue} />}
      onSubmit={onSubmit}
      error={
        loginError ? (
          <p role="alert" style={{ marginBottom: 12 }}>
            {loginError}
          </p>
        ) : null
      }
      submit={
        <Button
          type="submit"
          fullWidth
          disabled={isOffline || !canSubmitLogin || loginLoading}
        >
          {loginLoading ? "Logging in…" : "Log in"}
        </Button>
      }
      footer={
        <Link
          href={`/forgot-password?next=${encodeURIComponent(nextPath)}`}
          style={{
            textDecoration: "underline",
            fontSize: 14
          }}
        >
          Forgot password?
        </Link>
      }
    >
      <AuthField
        label="Email"
        value={loginEmail}
        onChange={(e) => onLoginEmailChange(e.target.value)}
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
        value={loginPassword}
        onChange={(e) => onLoginPasswordChange(e.target.value)}
        autoComplete="current-password"
        placeholder="Your password"
        disabled={isOffline}
        name="password"
      />
    </LoginTabLayout>
  );
}
