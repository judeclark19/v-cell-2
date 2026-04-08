"use client";

import { useEffect, useSyncExternalStore } from "react";

type CloudSyncAvailabilityState = {
  browserOffline: boolean;
  lastError: string | null;
  lastFailureAtMs: number;
  lastSuccessAtMs: number;
};

type CloudSyncAvailabilitySnapshot = CloudSyncAvailabilityState & {
  cloudUnavailable: boolean;
};

type PersistedCloudSyncAvailabilityState = {
  browserOffline: boolean;
  lastError: string | null;
  lastFailureAtMs: number;
  lastSuccessAtMs: number;
  version: 1;
};

const STORAGE_KEY = "vcell:cloudSyncAvailability:v1";

const listeners = new Set<() => void>();

let listenersRegistered = false;
let clientStateHydrated = false;
let state: CloudSyncAvailabilityState = {
  browserOffline: false,
  lastError: null,
  lastFailureAtMs: 0,
  lastSuccessAtMs: 0
};
let cachedClientSnapshot: CloudSyncAvailabilitySnapshot | null = null;

const serverSnapshot: CloudSyncAvailabilitySnapshot = {
  browserOffline: false,
  lastError: null,
  lastFailureAtMs: 0,
  lastSuccessAtMs: 0,
  cloudUnavailable: false
};

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Cloud sync unavailable";
}

function getBrowserOfflineSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return !window.navigator.onLine;
}

function normalizePersistedState(
  value: unknown
): PersistedCloudSyncAvailabilityState | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<PersistedCloudSyncAvailabilityState>;
  if (candidate.version !== 1) return null;

  const lastError =
    typeof candidate.lastError === "string" ? candidate.lastError : null;
  const lastFailureAtMs =
    typeof candidate.lastFailureAtMs === "number" &&
    Number.isFinite(candidate.lastFailureAtMs) &&
    candidate.lastFailureAtMs > 0
      ? candidate.lastFailureAtMs
      : 0;
  const lastSuccessAtMs =
    typeof candidate.lastSuccessAtMs === "number" &&
    Number.isFinite(candidate.lastSuccessAtMs) &&
    candidate.lastSuccessAtMs > 0
      ? candidate.lastSuccessAtMs
      : 0;

  return {
    browserOffline: candidate.browserOffline === true,
    lastError,
    lastFailureAtMs,
    lastSuccessAtMs,
    version: 1
  };
}

function persistState(nextState: CloudSyncAvailabilityState) {
  if (typeof window === "undefined") return;

  const payload: PersistedCloudSyncAvailabilityState = {
    browserOffline: nextState.browserOffline,
    lastError: nextState.lastError,
    lastFailureAtMs: nextState.lastFailureAtMs,
    lastSuccessAtMs: nextState.lastSuccessAtMs,
    version: 1
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures so sync state remains usable.
  }
}

function ensureClientStateHydrated() {
  if (clientStateHydrated || typeof window === "undefined") return;

  clientStateHydrated = true;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const persisted = normalizePersistedState(JSON.parse(raw));
    if (!persisted) return;

    state = {
      browserOffline: persisted.browserOffline,
      lastError: persisted.lastError,
      lastFailureAtMs: persisted.lastFailureAtMs,
      lastSuccessAtMs: persisted.lastSuccessAtMs
    };
  } catch {
    // Ignore malformed or inaccessible storage and fall back to defaults.
  }
}

function buildSnapshot(
  baseState: CloudSyncAvailabilityState
): CloudSyncAvailabilitySnapshot {
  return {
    ...baseState,
    cloudUnavailable:
      baseState.browserOffline ||
      baseState.lastFailureAtMs > baseState.lastSuccessAtMs
  };
}

function getClientSnapshot(): CloudSyncAvailabilitySnapshot {
  ensureClientStateHydrated();

  const nextState: CloudSyncAvailabilityState =
    typeof window === "undefined"
      ? state
      : {
          ...state,
          browserOffline: getBrowserOfflineSnapshot()
        };

  const nextSnapshot = buildSnapshot(nextState);

  if (
    cachedClientSnapshot &&
    cachedClientSnapshot.browserOffline === nextSnapshot.browserOffline &&
    cachedClientSnapshot.lastError === nextSnapshot.lastError &&
    cachedClientSnapshot.lastFailureAtMs === nextSnapshot.lastFailureAtMs &&
    cachedClientSnapshot.lastSuccessAtMs === nextSnapshot.lastSuccessAtMs &&
    cachedClientSnapshot.cloudUnavailable === nextSnapshot.cloudUnavailable
  ) {
    return cachedClientSnapshot;
  }

  cachedClientSnapshot = nextSnapshot;
  return nextSnapshot;
}

function emitChange() {
  cachedClientSnapshot = null;
  listeners.forEach((listener) => listener());
}

function updateState(next: Partial<CloudSyncAvailabilityState>) {
  const updated: CloudSyncAvailabilityState = {
    ...state,
    ...next
  };

  if (
    updated.browserOffline === state.browserOffline &&
    updated.lastError === state.lastError &&
    updated.lastFailureAtMs === state.lastFailureAtMs &&
    updated.lastSuccessAtMs === state.lastSuccessAtMs
  ) {
    return;
  }

  state = updated;
  persistState(state);
  emitChange();
}

function ensureBrowserListeners() {
  if (listenersRegistered || typeof window === "undefined") return;

  listenersRegistered = true;
  ensureClientStateHydrated();

  const updateBrowserState = () => {
    updateState({
      browserOffline: getBrowserOfflineSnapshot()
    });
  };

  updateBrowserState();
  window.addEventListener("online", updateBrowserState);
  window.addEventListener("offline", updateBrowserState);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function markCloudSyncAvailable() {
  ensureClientStateHydrated();
  updateState({
    browserOffline: getBrowserOfflineSnapshot(),
    lastError: null,
    lastSuccessAtMs: Date.now()
  });
}

export function markCloudSyncUnavailable(err: unknown) {
  ensureClientStateHydrated();
  updateState({
    browserOffline: getBrowserOfflineSnapshot(),
    lastError: toErrorMessage(err),
    lastFailureAtMs: Date.now()
  });
}

export function useCloudSyncAvailability(): CloudSyncAvailabilitySnapshot {
  const snapshot = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    () => serverSnapshot
  );

  useEffect(() => {
    ensureBrowserListeners();
  }, []);

  return snapshot;
}

export function useBrowserOffline(): boolean {
  return useCloudSyncAvailability().browserOffline;
}
