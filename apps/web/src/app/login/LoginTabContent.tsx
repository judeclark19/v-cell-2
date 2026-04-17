import Link from "next/link";
import GSIMaterialButton from "./GSIMaterialButton";
import { useLoginAuthFlows } from "./useLoginAuthFlows";
import Or from "@/ui/Or";

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
    <section>
      <p style={{ marginBottom: 36 }}>
        Existing user? Sign in to unlock your stats, leaderboard, and sync
        across devices.
      </p>
      <GSIMaterialButton inOrUp="in" onClick={loginAndContinue} />
      <Or />
      <form onSubmit={onSubmit}>
        <label style={{ display: "block", marginBottom: 10 }}>
          <span style={{ display: "block", marginBottom: 6 }}>Email</span>
          <input
            value={loginEmail}
            onChange={(e) => onLoginEmailChange(e.target.value)}
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
            value={loginPassword}
            onChange={(e) => onLoginPasswordChange(e.target.value)}
            autoComplete="current-password"
            placeholder="Your password"
            className="control full-width"
            type="password"
            disabled={isOffline}
            name="password"
          />
        </label>
        {loginError && (
          <p role="alert" style={{ marginBottom: 12 }}>
            {loginError}
          </p>
        )}
        <button
          type="submit"
          className="btn btn--primary full-width"
          disabled={isOffline || !canSubmitLogin || loginLoading}
        >
          {loginLoading ? "Logging in…" : "Log in"}
        </button>{" "}
      </form>
      <div
        style={{
          marginTop: 10,
          textAlign: "center"
        }}
      >
        <Link
          href={`/forgot-password?next=${encodeURIComponent(nextPath)}`}
          style={{
            textDecoration: "underline",
            fontSize: 14
          }}
        >
          Forgot password?
        </Link>
      </div>
    </section>
  );
}
