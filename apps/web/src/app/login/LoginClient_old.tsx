"use client";

import { useSession } from "@/state/auth/AuthProvider";
import { selectUid } from "@/state/auth/authSlice";
import { useSelector } from "react-redux";
import { useIsOffline } from "@/state/network/useIsOffline";
import { useLoginNavigation } from "./useLoginNavigation";
import { useLoginAuthFlows } from "./useLoginAuthFlows";
import { LoginIntro } from "./LoginIntro";
import { EmailLoginSection } from "./EmailLoginSection";
import { EmailSignupSection } from "./EmailSignupSection";

export default function LoginClient() {
  const uid = useSelector(selectUid);
  const isOffline = useIsOffline();
  const { isUser, hydrated } = useSession();
  const { nextPath, replaceToNextPath } = useLoginNavigation();
  const authFlows = useLoginAuthFlows({
    isOffline,
    nextPath,
    replaceToNextPath
  });

  return (
    <main>
      <LoginIntro
        isOffline={isOffline}
        nextPath={nextPath}
        hydrated={hydrated}
        uid={uid}
        isUser={isUser}
      />

      {!isOffline && (
        <div>
          <section
            style={{
              display: "flex",
              gap: "12px"
            }}
          >
            <div style={{ flex: 1 }}>
              <button
                title="Log in and continue"
                onClick={authFlows.loginAndContinue}
                type="button"
                className="btn btn--primary"
                disabled={isOffline}
              >
                Log in or sign up with Google
              </button>
            </div>
            <div
              aria-hidden="true"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--muted)",
                fontSize: 14,
                width: 70
              }}
            >
              <span
                style={{
                  flex: 1,
                  height: 1,
                  background: "currentColor",
                  opacity: 0.3
                }}
              />
              <span>or</span>
              <span
                style={{
                  flex: 1,
                  height: 1,
                  background: "currentColor",
                  opacity: 0.3
                }}
              />
            </div>
            <EmailLoginSection
              nextPath={nextPath}
              isOffline={isOffline}
              loginEmail={authFlows.loginEmail}
              loginPassword={authFlows.loginPassword}
              loginLoading={authFlows.loginLoading}
              loginError={authFlows.loginError}
              canSubmitLogin={authFlows.canSubmitLogin}
              onLoginEmailChange={authFlows.setLoginEmail}
              onLoginPasswordChange={authFlows.setLoginPassword}
              onSubmit={authFlows.loginWithEmail}
            />
          </section>
          <EmailSignupSection
            isOffline={isOffline}
            signupDisplayName={authFlows.signupDisplayName}
            signupEmail={authFlows.signupEmail}
            signupPassword={authFlows.signupPassword}
            signupLoading={authFlows.signupLoading}
            signupError={authFlows.signupError}
            canSubmitSignup={authFlows.canSubmitSignup}
            onSignupDisplayNameChange={authFlows.setSignupDisplayName}
            onSignupEmailChange={authFlows.setSignupEmail}
            onSignupPasswordChange={authFlows.setSignupPassword}
            onSubmit={authFlows.signupWithEmail}
          />
        </div>
      )}
    </main>
  );
}
