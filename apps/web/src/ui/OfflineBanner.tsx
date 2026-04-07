"use client";

import { useIsOffline } from "@/state/network/useIsOffline";
import "./offline-banner.css";

export function OfflineBanner() {
  const isOffline = useIsOffline();

  if (!isOffline) return null;

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <div className="max-width-container">
        <p className="offline-banner__text">
          Offline mode: gameplay stays local on this device and cloud sync will
          resume when you reconnect.
        </p>
      </div>
    </div>
  );
}
