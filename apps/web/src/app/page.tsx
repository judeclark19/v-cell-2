"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { selectUid, selectAuthReady } from "@/state/auth/authSlice";

export default function HomePage() {
  const router = useRouter();
  const uid = useSelector(selectUid);
  const authReady = useSelector(selectAuthReady);
  const isUser = Boolean(uid);

  useEffect(() => {
    if (!authReady) return; // Wait for auth to resolve before redirecting.
    if (isUser) {
      router.replace("/game");
    } else {
      router.replace("/login");
    }
  }, [isUser, authReady, router]);

  return <main style={{ padding: 24, opacity: 0.7 }}>Redirecting…</main>;
}
