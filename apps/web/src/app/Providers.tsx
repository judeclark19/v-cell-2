"use client";

import React from "react";
import { Provider as ReduxProvider } from "react-redux";
import { reduxStore } from "@/state/reduxStore";
import { SessionProvider } from "@/state/auth/AuthProvider";
import { GameLifecycle } from "@/state/game/GameLifecycle";
import { ThemeProvider } from "@/state/theme/ThemeProvider";
import { AuthGate } from "@/state/auth/AuthGate";
import { SettingsDriver } from "@/state/ui/SettingsDriver";
import { RouteTransitionProvider } from "@/ui/RouteTransition";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider store={reduxStore}>
      <ThemeProvider>
        <RouteTransitionProvider>
          <SettingsDriver />
          <SessionProvider>
            <GameLifecycle />
            {children}
          </SessionProvider>
        </RouteTransitionProvider>
      </ThemeProvider>
    </ReduxProvider>
  );
}
