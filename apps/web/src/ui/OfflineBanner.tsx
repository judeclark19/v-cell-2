"use client";

import { Banner, BannerText } from "@vcell/ui";
import { useIsOffline } from "@/state/network/useIsOffline";

export function OfflineBanner() {
  const isOffline = useIsOffline();

  if (!isOffline) return null;

  return (
    <Banner sticky tone="status" role="status" aria-live="polite">
      <div className="max-width-container">
        <BannerText>
          Cloud sync is unavailable right now. Gameplay stays local on this
          device and sync will resume when the connection recovers.
        </BannerText>
      </div>
    </Banner>
  );
}
