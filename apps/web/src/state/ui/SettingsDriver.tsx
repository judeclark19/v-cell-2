"use client";

import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { UndoLimit, FaceDownCount } from "@vcell/engine";
import {
  ALLOW_FOUNDATION_PULLBACK_KEY,
  FACE_DOWN_COUNT_KEY,
  MOTION_PREFERENCE_KEY,
  SHOW_TIMER_KEY,
  UNDO_LIMIT_KEY
} from "./settingsListeners";
import {
  selectMotionPreference,
  setMotionPreference,
  setSettingsHydrated,
  setShowTimer
} from "./uiSlice";
import type { AppDispatch } from "../reduxStore";
import {
  applyReducedMotionToDom,
  parseMotionPreference,
  prefersReducedMotion,
  REDUCED_MOTION_MEDIA_QUERY
} from "./motionPreference";
import {
  setAllowFoundationPullbackRule,
  setFaceDownCountRule,
  setUndoLimitRule
} from "../game/gameSlice";

const VALID_UNDO_LIMITS: UndoLimit[] = [0, 1, 3, 5, "unlimited"];
const VALID_FACE_DOWN_COUNTS: FaceDownCount[] = [0, 7, 14, 21];

function parseStoredBoolean(value: string | null): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function parseStoredUndoLimit(value: string | null): UndoLimit | null {
  if (value === null) return null;
  if (value === "unlimited") return value;

  const parsed = Number(value);
  return VALID_UNDO_LIMITS.includes(parsed as UndoLimit)
    ? (parsed as UndoLimit)
    : null;
}

function parseStoredFaceDownCount(value: string | null): FaceDownCount | null {
  if (value === null) return null;
  const parsed = Number(value);
  return VALID_FACE_DOWN_COUNTS.includes(parsed as FaceDownCount)
    ? (parsed as FaceDownCount)
    : null;
}

export function hydrateSettingsFromStorage(storage: Storage) {
  return {
    allowFoundationPullback: parseStoredBoolean(
      storage.getItem(ALLOW_FOUNDATION_PULLBACK_KEY)
    ),
    faceDownCount: parseStoredFaceDownCount(
      storage.getItem(FACE_DOWN_COUNT_KEY)
    ),
    motionPreference: parseMotionPreference(
      storage.getItem(MOTION_PREFERENCE_KEY)
    ),
    showTimer: parseStoredBoolean(storage.getItem(SHOW_TIMER_KEY)),
    undoLimit: parseStoredUndoLimit(storage.getItem(UNDO_LIMIT_KEY))
  };
}

export function SettingsDriver() {
  const dispatch = useDispatch<AppDispatch>();
  const motionPreference = useSelector(selectMotionPreference);
  const didHydrateRef = useRef(false);

  useEffect(() => {
    if (didHydrateRef.current) return;
    didHydrateRef.current = true;

    try {
      const settings = hydrateSettingsFromStorage(window.localStorage);

      if (settings.showTimer !== null) {
        dispatch(setShowTimer(settings.showTimer));
      }

      if (settings.undoLimit !== null) {
        dispatch(setUndoLimitRule(settings.undoLimit));
      }

      if (settings.faceDownCount !== null) {
        dispatch(setFaceDownCountRule(settings.faceDownCount));
      }

      if (settings.allowFoundationPullback !== null) {
        dispatch(
          setAllowFoundationPullbackRule(settings.allowFoundationPullback)
        );
      }

      dispatch(setMotionPreference(settings.motionPreference));
    } finally {
      dispatch(setSettingsHydrated(true));
    }
  }, [dispatch]);

  useEffect(() => {
    const sync = () => {
      applyReducedMotionToDom(
        motionPreference === "system"
          ? prefersReducedMotion()
          : motionPreference === "reduce"
      );
    };

    sync();

    if (motionPreference !== "system") return;

    let mediaQueryList: MediaQueryList | null = null;
    try {
      mediaQueryList = window.matchMedia?.(REDUCED_MOTION_MEDIA_QUERY) ?? null;
    } catch {
      mediaQueryList = null;
    }

    if (!mediaQueryList) return;

    const onChange = () => sync();

    if (typeof mediaQueryList.addEventListener === "function") {
      mediaQueryList.addEventListener("change", onChange);
      return () => mediaQueryList?.removeEventListener("change", onChange);
    }

    return;
  }, [motionPreference]);

  return null;
}
