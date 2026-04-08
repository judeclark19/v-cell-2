"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { selectUid, selectAuthReady } from "@/state/auth/authSlice";
import { useIsOffline } from "@/state/network/useIsOffline";

export default function HomePage() {
  const router = useRouter();
  const uid = useSelector(selectUid);
  const authReady = useSelector(selectAuthReady);
  const isOffline = useIsOffline();
  const isUser = Boolean(uid);

  useEffect(() => {
    if (isOffline) {
      router.replace("/game");
      return;
    }

    if (!authReady) return; // Wait for auth to resolve before redirecting.
    if (isUser) {
      router.replace("/game");
    } else {
      router.replace("/login");
    }
  }, [isUser, authReady, isOffline, router]);

  return <main style={{ padding: 24, opacity: 0.7 }}>Redirecting…</main>;
}
