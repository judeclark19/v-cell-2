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
          Cloud sync is unavailable right now. Gameplay stays local on this
          device and sync will resume when the connection recovers.
        </p>
      </div>
    </div>
  );
}
