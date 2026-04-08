import { describe, expect, it } from "vitest";
import {
  applyReducedMotionToDom,
  parseMotionPreference,
  resolveReducedMotion
} from "./motionPreference";
import { hydrateSettingsFromStorage } from "./SettingsDriver";
import {
  ALLOW_FOUNDATION_PULLBACK_KEY,
  FACE_DOWN_COUNT_KEY,
  MOTION_PREFERENCE_KEY,
  SHOW_TIMER_KEY,
  UNDO_LIMIT_KEY
} from "./settingsListeners";

describe("motionPreference helpers", () => {
  it("defaults missing storage values to system motion", () => {
    const storage = window.localStorage;
    storage.clear();

    const settings = hydrateSettingsFromStorage(storage);

    expect(settings.motionPreference).toBe("system");
    expect(settings.showTimer).toBeNull();
    expect(settings.undoLimit).toBeNull();
    expect(settings.faceDownCount).toBeNull();
    expect(settings.allowFoundationPullback).toBeNull();
  });

  it("hydrates persisted settings and parses motion preference", () => {
    const storage = window.localStorage;
    storage.clear();
    storage.setItem(SHOW_TIMER_KEY, "false");
    storage.setItem(MOTION_PREFERENCE_KEY, "reduce");
    storage.setItem(UNDO_LIMIT_KEY, "3");
    storage.setItem(FACE_DOWN_COUNT_KEY, "14");
    storage.setItem(ALLOW_FOUNDATION_PULLBACK_KEY, "true");

    const settings = hydrateSettingsFromStorage(storage);

    expect(settings.showTimer).toBe(false);
    expect(settings.motionPreference).toBe("reduce");
    expect(settings.undoLimit).toBe(3);
    expect(settings.faceDownCount).toBe(14);
    expect(settings.allowFoundationPullback).toBe(true);
  });

  it("resolves reduced motion for manual overrides and system mode", () => {
    expect(resolveReducedMotion("reduce", false)).toBe(true);
    expect(resolveReducedMotion("full", true)).toBe(false);
    expect(resolveReducedMotion("system", true)).toBe(true);
    expect(resolveReducedMotion("system", false)).toBe(false);
  });

  it("applies the effective reduced-motion flag to the root element", () => {
    applyReducedMotionToDom(true);
    expect(document.documentElement.dataset.reducedMotion).toBe("true");

    applyReducedMotionToDom(false);
    expect(document.documentElement.dataset.reducedMotion).toBe("false");
  });

  it("falls back to system when an invalid motion preference is stored", () => {
    expect(parseMotionPreference("banana")).toBe("system");
  });
});
