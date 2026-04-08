import { useSyncExternalStore } from "react";

export type MotionPreference = "system" | "reduce" | "full";

export const DEFAULT_MOTION_PREFERENCE: MotionPreference = "system";
export const REDUCED_MOTION_MEDIA_QUERY = "(prefers-reduced-motion: reduce)";

export function isMotionPreference(
  value: string | null | undefined
): value is MotionPreference {
  return value === "system" || value === "reduce" || value === "full";
}

export function parseMotionPreference(
  value: string | null | undefined
): MotionPreference {
  return isMotionPreference(value) ? value : DEFAULT_MOTION_PREFERENCE;
}

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.(REDUCED_MOTION_MEDIA_QUERY)?.matches ?? false;
  } catch {
    return false;
  }
}

export function resolveReducedMotion(
  motionPreference: MotionPreference,
  systemPrefersReduced: boolean
): boolean {
  if (motionPreference === "reduce") return true;
  if (motionPreference === "full") return false;
  return systemPrefersReduced;
}

export function applyReducedMotionToDom(isReducedMotion: boolean) {
  document.documentElement.dataset.reducedMotion = String(isReducedMotion);
}

function subscribeToSystemReducedMotion(callback: () => void) {
  let mediaQueryList: MediaQueryList | null = null;

  try {
    mediaQueryList = window.matchMedia?.(REDUCED_MOTION_MEDIA_QUERY) ?? null;
  } catch {
    mediaQueryList = null;
  }

  if (!mediaQueryList) {
    return () => {};
  }

  if (typeof mediaQueryList.addEventListener === "function") {
    mediaQueryList.addEventListener("change", callback);
    return () => mediaQueryList?.removeEventListener("change", callback);
  }

  mediaQueryList.addEventListener("change", callback);
  return () => mediaQueryList?.removeEventListener("change", callback);
}

function getSystemReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;
  return prefersReducedMotion();
}

export function useReducedMotionEnabled(motionPreference: MotionPreference) {
  const systemPrefersReduced = useSyncExternalStore(
    subscribeToSystemReducedMotion,
    getSystemReducedMotionSnapshot,
    () => false
  );

  return resolveReducedMotion(motionPreference, systemPrefersReduced);
}
