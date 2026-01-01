"use client";

import { useEffect } from "react";

type Theme = "poker" | "times-light" | "times-dark";

const STORAGE_KEY = "vcell-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;

    const theme =
      stored ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "times-dark"
        : "poker");

    document.documentElement.dataset.theme = theme;
  }, []);

  return <>{children}</>;
}
