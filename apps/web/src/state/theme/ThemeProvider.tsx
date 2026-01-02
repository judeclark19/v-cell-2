"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

export type Theme = "poker" | "times-light" | "times-dark";

const STORAGE_KEY = "vcell-theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function safeReadStoredTheme(): Theme | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "poker" || raw === "times-light" || raw === "times-dark"
      ? raw
      : null;
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

function applyThemeToDom(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Don’t touch window/localStorage during render; Next can SSR client components.
  const [theme, setThemeState] = useState<Theme>("poker");

  // On mount: choose stored theme, else OS preference.
  useEffect(() => {
    const stored = safeReadStoredTheme();
    const initial: Theme = stored ?? (prefersDark() ? "times-dark" : "poker");
    setThemeState(initial);
    applyThemeToDom(initial);
  }, []);

  // Whenever theme changes: persist + apply.
  useEffect(() => {
    applyThemeToDom(theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
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
