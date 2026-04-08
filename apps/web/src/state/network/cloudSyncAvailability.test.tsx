"use client";

import { render, renderHook, screen, act } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const STORAGE_KEY = "vcell:cloudSyncAvailability:v1";

type CloudSyncAvailabilityModule = typeof import("./cloudSyncAvailability");
type UseIsOfflineModule = typeof import("./useIsOffline");

let online = true;

function setNavigatorOnline(value: boolean, dispatch = false) {
  online = value;

  if (dispatch) {
    window.dispatchEvent(new Event(value ? "online" : "offline"));
  }
}

function writePersistedAvailability({
  browserOffline = false,
  lastError = null,
  lastFailureAtMs = 0,
  lastSuccessAtMs = 0
}: {
  browserOffline?: boolean;
  lastError?: string | null;
  lastFailureAtMs?: number;
  lastSuccessAtMs?: number;
}) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      browserOffline,
      lastError,
      lastFailureAtMs,
      lastSuccessAtMs,
      version: 1
    })
  );
}

async function loadCloudSyncAvailabilityModule(): Promise<CloudSyncAvailabilityModule> {
  return import("./cloudSyncAvailability");
}

async function loadUseIsOfflineModule(): Promise<UseIsOfflineModule> {
  return import("./useIsOffline");
}

beforeAll(() => {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => online
  });
});

beforeEach(() => {
  vi.resetModules();
  window.localStorage.clear();
  setNavigatorOnline(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("cloudSyncAvailability", () => {
  it("persists a cloud failure and hydrates it on a fresh load while online", async () => {
    const cloudSyncAvailability = await loadCloudSyncAvailabilityModule();

    act(() => {
      cloudSyncAvailability.markCloudSyncUnavailable(new Error("server unavailable"));
    });

    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null")).toMatchObject({
      lastError: "server unavailable",
      version: 1
    });

    vi.resetModules();

    const hydratedModule = await loadCloudSyncAvailabilityModule();
    const { result } = renderHook(() => hydratedModule.useCloudSyncAvailability());

    expect(result.current.cloudUnavailable).toBe(true);
    expect(result.current.browserOffline).toBe(false);
    expect(result.current.lastError).toBe("server unavailable");
  });

  it("hydrates as healthy when persisted success is newer than persisted failure", async () => {
    writePersistedAvailability({
      lastError: null,
      lastFailureAtMs: 10,
      lastSuccessAtMs: 20
    });

    const cloudSyncAvailability = await loadCloudSyncAvailabilityModule();
    const { result } = renderHook(() => cloudSyncAvailability.useCloudSyncAvailability());

    expect(result.current.cloudUnavailable).toBe(false);
    expect(result.current.lastSuccessAtMs).toBe(20);
  });

  it("clears persisted degraded state only after a real success writer runs", async () => {
    writePersistedAvailability({
      lastError: "timeout",
      lastFailureAtMs: 50,
      lastSuccessAtMs: 0
    });

    const cloudSyncAvailability = await loadCloudSyncAvailabilityModule();
    const { result } = renderHook(() => cloudSyncAvailability.useCloudSyncAvailability());

    expect(result.current.cloudUnavailable).toBe(true);

    act(() => {
      cloudSyncAvailability.markCloudSyncAvailable();
    });

    expect(result.current.cloudUnavailable).toBe(false);

    const persisted = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    expect(persisted).toMatchObject({
      lastError: null,
      version: 1
    });
    expect(persisted.lastSuccessAtMs).toBeGreaterThan(persisted.lastFailureAtMs);

    vi.resetModules();

    const reloadedModule = await loadCloudSyncAvailabilityModule();
    const { result: reloaded } = renderHook(() => reloadedModule.useCloudSyncAvailability());

    expect(reloaded.current.cloudUnavailable).toBe(false);
  });

  it("forces cloud unavailable while the browser is offline even without persisted failure", async () => {
    setNavigatorOnline(false);

    const cloudSyncAvailability = await loadCloudSyncAvailabilityModule();
    const { result } = renderHook(() => cloudSyncAvailability.useCloudSyncAvailability());

    expect(result.current.browserOffline).toBe(true);
    expect(result.current.cloudUnavailable).toBe(true);
    expect(result.current.lastFailureAtMs).toBe(0);
  });

  it("does not clear a persisted cloud failure when the browser comes back online", async () => {
    writePersistedAvailability({
      lastError: "gateway timeout",
      lastFailureAtMs: 99,
      lastSuccessAtMs: 0
    });

    const cloudSyncAvailability = await loadCloudSyncAvailabilityModule();
    const { result } = renderHook(() => cloudSyncAvailability.useCloudSyncAvailability());

    expect(result.current.cloudUnavailable).toBe(true);

    act(() => {
      setNavigatorOnline(false, true);
    });

    expect(result.current.browserOffline).toBe(true);
    expect(result.current.cloudUnavailable).toBe(true);

    act(() => {
      setNavigatorOnline(true, true);
    });

    expect(result.current.browserOffline).toBe(false);
    expect(result.current.cloudUnavailable).toBe(true);
    expect(result.current.lastError).toBe("gateway timeout");
  });

  it("returns a stable snapshot object when nothing has changed", async () => {
    const cloudSyncAvailability = await loadCloudSyncAvailabilityModule();
    const { result, rerender } = renderHook(() =>
      cloudSyncAvailability.useCloudSyncAvailability()
    );

    const firstSnapshot = result.current;
    rerender();

    expect(result.current).toBe(firstSnapshot);
  });

  it("updates a real consumer immediately from persisted degraded state and clears after success", async () => {
    writePersistedAvailability({
      lastError: "sync down",
      lastFailureAtMs: 100,
      lastSuccessAtMs: 0
    });

    const cloudSyncAvailability = await loadCloudSyncAvailabilityModule();
    const { useIsOffline } = await loadUseIsOfflineModule();

    function OfflineStatus() {
      const isOffline = useIsOffline();
      return <div>{isOffline ? "offline" : "online"}</div>;
    }

    render(<OfflineStatus />);

    expect(screen.getByText("offline")).toBeInTheDocument();

    act(() => {
      cloudSyncAvailability.markCloudSyncAvailable();
    });

    expect(screen.getByText("online")).toBeInTheDocument();
  });
});
