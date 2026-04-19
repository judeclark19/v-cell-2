"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Banner, BannerActions, BannerInner, BannerText, Button } from "@vcell/ui";
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
    <Banner role="status" aria-live="polite">
      <div className="max-width-container">
        <BannerInner>
        <BannerText>
          You are currently playing in guest mode. Log in to enable game history
          and stats.
        </BannerText>

        <BannerActions>
          <Button
            onClick={() => {
              router.replace("/login");
            }}
          >
            Go to login page
          </Button>

          <Button variant="ghost" onClick={dismiss}>
            Dismiss
          </Button>
        </BannerActions>
        </BannerInner>
      </div>
    </Banner>
  );
}
