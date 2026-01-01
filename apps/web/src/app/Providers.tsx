"use client";

import React from "react";
import { SessionProvider } from "@/state/session/SessionProvider";
import { GameProvider } from "@/state/game/GameProvider"; // or wherever you put it
import { ThemeProvider } from "@/state/theme/ThemeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <GameProvider>{children}</GameProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
