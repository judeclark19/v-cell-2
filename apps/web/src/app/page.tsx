"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/state/session/SessionProvider";

export default function HomePage() {
  const router = useRouter();
  const { isUser, isGuest } = useSession();

  useEffect(() => {
    if (isUser) {
      router.replace("/game");
    } else {
      router.replace("/login");
    }
  }, [isUser, isGuest, router]);

  // Optional: tiny fallback while redirecting
  return <main style={{ padding: 24, opacity: 0.7 }}>Redirecting…</main>;
}
