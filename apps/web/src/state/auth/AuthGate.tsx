"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/state/auth/AuthProvider";
import { useSelector } from "react-redux";
import { selectUid } from "@/state/auth/authSlice";

type Props = {
  children: React.ReactNode;
  howToPlayPath?: string;
};

export function AuthGate({ children, howToPlayPath = "/how-to-play" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { authReady, profileReady, needsHowToPlay } = useSession();
  const uid = useSelector(selectUid);
  const shouldWaitForProfile = uid && !profileReady;
  const shouldRedirectToHowToPlay =
    Boolean(uid) &&
    profileReady &&
    needsHowToPlay &&
    pathname !== howToPlayPath;

  useEffect(() => {
    // Wait until auth + profile are resolved before making routing decisions.
    if (!authReady) return;
    if (shouldWaitForProfile) return;

    if (shouldRedirectToHowToPlay) {
      router.replace(howToPlayPath);
    }
  }, [
    authReady,
    shouldWaitForProfile,
    shouldRedirectToHowToPlay,
    howToPlayPath,
    router
  ]);

  if (!authReady || shouldWaitForProfile) {
    return null;
  }

  if (shouldRedirectToHowToPlay) {
    return null;
  }

  return <>{children}</>;
}
