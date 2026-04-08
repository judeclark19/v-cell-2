"use client";

import {
  useBrowserOffline,
  useCloudSyncAvailability
} from "./cloudSyncAvailability";

export function useIsOffline(): boolean {
  return useCloudSyncAvailability().cloudUnavailable;
}

export { useBrowserOffline, useCloudSyncAvailability };
