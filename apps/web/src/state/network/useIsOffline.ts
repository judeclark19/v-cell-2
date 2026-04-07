"use client";

import { useEffect, useState } from "react";

const OFFLINE_STORAGE_KEY = "vcell:isOffline";

function readStoredOfflineState(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return window.sessionStorage.getItem(OFFLINE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeStoredOfflineState(isOffline: boolean) {
  if (typeof window === "undefined") return;

  try {
    if (isOffline) {
      window.sessionStorage.setItem(OFFLINE_STORAGE_KEY, "1");
    } else {
      window.sessionStorage.removeItem(OFFLINE_STORAGE_KEY);
    }
  } catch {
    // ignore storage issues
  }
}

export function useIsOffline(): boolean {
  const [isOffline, setIsOffline] = useState(readStoredOfflineState);

  useEffect(() => {
    const update = () => {
      const nextIsOffline = !window.navigator.onLine || readStoredOfflineState();
      setIsOffline(nextIsOffline);
    };

    const setOffline = () => {
      writeStoredOfflineState(true);
      setIsOffline(true);
    };

    const setOnline = () => {
      writeStoredOfflineState(false);
      setIsOffline(false);
    };

    update();

    window.addEventListener("online", setOnline);
    window.addEventListener("offline", setOffline);
    document.addEventListener("visibilitychange", update);

    return () => {
      window.removeEventListener("online", setOnline);
      window.removeEventListener("offline", setOffline);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return isOffline;
}
