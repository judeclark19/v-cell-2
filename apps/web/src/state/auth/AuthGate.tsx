"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/state/auth/AuthProvider";
import { useSelector } from "react-redux";
import { selectUid } from "@/state/auth/authSlice";

type Props = {
  children: React.ReactNode;
  finishSignupPath?: string; // default "/finish-setup"
  howToPlayPath?: string;
};

export function AuthGate({
  children,
  finishSignupPath = "/finish-signup",
  howToPlayPath = "/how-to-play"
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { authReady, profileReady, profileComplete, needsHowToPlay } =
    useSession();
  const uid = useSelector(selectUid);
  const shouldWaitForProfile = uid && !profileReady;
  const shouldRedirectToHowToPlay =
    Boolean(uid) &&
    profileReady &&
    profileComplete &&
    needsHowToPlay &&
    pathname !== howToPlayPath;
  const shouldRedirectToFinishSignup =
    Boolean(uid) &&
    profileReady &&
    !profileComplete &&
    pathname !== finishSignupPath;
  const shouldRedirectFromFinishSignup =
    Boolean(uid) &&
    profileReady &&
    profileComplete &&
    pathname === finishSignupPath;

  useEffect(() => {
    // Wait until auth + profile are resolved before making routing decisions.
    if (!authReady) return;
    if (shouldWaitForProfile) return;

    if (shouldRedirectToHowToPlay) {
      router.replace(howToPlayPath);
      return;
    }

    if (shouldRedirectToFinishSignup) {
      router.replace(finishSignupPath);
      return;
    }

    if (shouldRedirectFromFinishSignup) {
      router.replace("/");
    }
  }, [
    authReady,
    shouldWaitForProfile,
    shouldRedirectToHowToPlay,
    shouldRedirectToFinishSignup,
    shouldRedirectFromFinishSignup,
    finishSignupPath,
    howToPlayPath,
    router
  ]);

  if (!authReady || shouldWaitForProfile) {
    return null;
  }

  if (
    shouldRedirectToHowToPlay ||
    shouldRedirectToFinishSignup ||
    shouldRedirectFromFinishSignup
  ) {
    return null;
  }

  return <>{children}</>;
}
