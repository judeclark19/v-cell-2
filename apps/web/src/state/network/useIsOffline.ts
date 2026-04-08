"use client";

import { useEffect, useState } from "react";

export function useIsOffline(): boolean {
  const [isOffline, setIsOffline] = useState(() => {
    if (typeof window === "undefined") return false;
    return !window.navigator.onLine;
  });

  useEffect(() => {
    const update = () => setIsOffline(!window.navigator.onLine);

    update();

    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return isOffline;
}
