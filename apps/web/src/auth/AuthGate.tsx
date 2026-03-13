"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/auth/AuthProvider";
import { useSelector } from "react-redux";
import { selectUid } from "@/state/auth/authSlice";

type Props = {
  children: React.ReactNode;
  finishSignupPath?: string; // default "/finish-setup"
};

export function AuthGate({
  children,
  finishSignupPath = "/finish-signup"
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { authReady, profileReady, profileComplete } = useSession();
  const uid = useSelector(selectUid);

  useEffect(() => {
    // Wait until auth + profile are resolved before making routing decisions.
    if (!authReady) return;
    if (uid && !profileReady) return;

    // Logged-in but incomplete profile -> force Finish Setup (unless already there).
    if (
      uid &&
      profileReady &&
      !profileComplete &&
      pathname !== finishSignupPath
    ) {
      router.replace(finishSignupPath);
      return;
    }

    // Logged-in and complete, but currently on finish setup -> bounce home.
    if (
      uid &&
      profileReady &&
      profileComplete &&
      pathname === finishSignupPath
    ) {
      router.replace("/");
    }
  }, [
    authReady,
    uid,
    profileReady,
    profileComplete,
    pathname,
    finishSignupPath,
    router
  ]);

  return <>{children}</>;
}
