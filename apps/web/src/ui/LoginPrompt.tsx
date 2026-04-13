"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import "./install-prompt.css";
import { useSelector } from "react-redux";
import { selectUid } from "@/state/auth/authSlice";
import { useIsOffline } from "@/state/network/useIsOffline";

export const LOGIN_PROMPT_DISMISS_KEY = "vcell:loginPrompt:dismissed";

export function LoginPrompt() {
  const router = useRouter();
  const pathname = usePathname();
  const uid = useSelector(selectUid);
  const isOffline = useIsOffline();

  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(LOGIN_PROMPT_DISMISS_KEY) === "true";
  });

  const shouldShow = useMemo(() => {
    if (typeof window === "undefined") return false;
    if (dismissed) return false;
    if (uid) return false;
    if (isOffline) return false;
    if (pathname !== "/game") return false;
    return true;
  }, [dismissed, uid, isOffline, pathname]);

  const dismiss = () => {
    setDismissed(true);
    window.localStorage.setItem(LOGIN_PROMPT_DISMISS_KEY, "true");
  };

  if (!shouldShow) return null;

  return (
    <div className="install-prompt" role="status" aria-live="polite">
      <div className="max-width-container install-prompt__inner">
        <p className="install-prompt__text">
          You are currently playing in guest mode. Log in to enable game history
          and stats.
        </p>

        <div className="install-prompt__actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              router.replace("/login");
            }}
          >
            Go to login page
          </button>

          <button type="button" className="btn btn--ghost" onClick={dismiss}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
