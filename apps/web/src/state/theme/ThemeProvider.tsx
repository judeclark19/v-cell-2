"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore
} from "react";

export type Theme = "poker" | "times-light" | "times-dark";

const STORAGE_KEY = "vcell-theme";
const THEME_EVENT = "vcell-theme-change";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isTheme(v: unknown): v is Theme {
  return v === "poker" || v === "times-light" || v === "times-dark";
}

function safeReadStoredTheme(): Theme | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isTheme(raw) ? raw : null;
  } catch {
    return null;
  }
}

function prefersDark(): boolean {
  try {
    return (
      window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false
    );
  } catch {
    return false;
  }
}

function computeTheme(): Theme {
  // Client snapshot: stored theme wins, else OS preference.
  const stored = safeReadStoredTheme();
  return stored ?? (prefersDark() ? "times-dark" : "poker");
}

function applyThemeToDom(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

function subscribe(callback: () => void) {
  // Recompute theme when:
  // - localStorage changes (other tabs)
  // - OS color scheme changes
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === STORAGE_KEY) callback();
  };

  window.addEventListener("storage", onStorage);

  const onThemeEvent = () => callback();
  window.addEventListener(THEME_EVENT, onThemeEvent);

  // Listen for OS theme changes.
  const onMql = () => callback();

  let mql: MediaQueryList | null = null;
  try {
    mql = window.matchMedia?.("(prefers-color-scheme: dark)") ?? null;
  } catch {
    mql = null;
  }

  if (mql) {
    // Modern browsers
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onMql);
    } else if (hasLegacyMqlListeners(mql)) {
      // Older Safari (deprecated API)
      mql.addListener(onMql);
    }
  }

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(THEME_EVENT, onThemeEvent);
    if (mql) {
      if (typeof mql.removeEventListener === "function") {
        mql.removeEventListener("change", onMql);
      } else if (hasLegacyMqlListeners(mql)) {
        mql.removeListener(onMql);
      }
    }
  };
}

type LegacyMediaQueryList = MediaQueryList & {
  addListener: (listener: () => void) => void;
  removeListener: (listener: () => void) => void;
};

function hasLegacyMqlListeners(
  mql: MediaQueryList
): mql is LegacyMediaQueryList {
  return (
    typeof (mql as unknown as { addListener?: unknown }).addListener ===
      "function" &&
    typeof (mql as unknown as { removeListener?: unknown }).removeListener ===
      "function"
  );
}

function getServerSnapshot(): Theme {
  // On the server we can’t know the user’s stored preference or OS theme.
  return "poker";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // useSyncExternalStore avoids "setState in effect" and keeps SSR safe.
  const theme = useSyncExternalStore(
    subscribe,
    computeTheme,
    getServerSnapshot
  );

  // Keep the DOM in sync with the computed theme.
  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    // Persist first, then apply. The subscription will also update consumers.
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }

    // Apply immediately for responsiveness.
    applyThemeToDom(next);

    // Notify same-tab subscribers (the `storage` event won’t fire in this tab).
    try {
      window.dispatchEvent(new Event(THEME_EVENT));
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme }),
    [theme, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider />");
  return ctx;
}
