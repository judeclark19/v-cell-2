"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/state/auth/AuthProvider";

export type LoginNavigationState = {
  nextPath: string;
  replaceToNextPath: () => void;
};

export function useLoginNavigation(): LoginNavigationState {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isUser, hydrated } = useSession();

  const rawNext = searchParams.get("next");
  const nextPath = rawNext && rawNext.startsWith("/") ? rawNext : "/game";

  useEffect(() => {
    if (!hydrated || !isUser) return;
    router.replace(nextPath);
  }, [hydrated, isUser, nextPath, router]);

  return {
    nextPath,
    replaceToNextPath: () => {
      router.replace(nextPath);
    }
  };
}
