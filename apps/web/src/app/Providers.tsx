"use client";

import React from "react";
import { Provider as ReduxProvider } from "react-redux";
import { reduxStore } from "@/state/reduxStore";
import { SessionProvider } from "@/state/session/SessionProvider";
import { GameProvider } from "@/state/game/GameProvider"; // or wherever you put it
import { ThemeProvider } from "@/state/theme/ThemeProvider";
import { AuthGate } from "@/state/session/AuthGate";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider store={reduxStore}>
      <ThemeProvider>
        <SessionProvider>
          <AuthGate>
            <GameProvider>{children}</GameProvider>
          </AuthGate>
        </SessionProvider>
      </ThemeProvider>
    </ReduxProvider>
  );
}
