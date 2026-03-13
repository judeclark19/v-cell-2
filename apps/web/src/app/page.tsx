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
    if (isUser) {
      router.replace("/game");
    } else {
      router.replace("/login");
    }
  }, [isUser, authReady, router]);

  // Optional: tiny fallback while redirecting
  return <main style={{ padding: 24, opacity: 0.7 }}>Redirecting…</main>;
}
