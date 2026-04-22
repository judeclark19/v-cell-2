"use client";

import React from "react";
import { Provider as ReduxProvider } from "react-redux";
import { reduxStore } from "@/state/reduxStore";
import { SessionProvider } from "@/state/auth/AuthProvider";
import { GameLifecycle } from "@/state/game/GameLifecycle";
import { ThemeProvider } from "@/state/theme/ThemeProvider";
import { AuthGate } from "@/state/auth/AuthGate";
import { SettingsDriver } from "@/state/ui/SettingsDriver";
import { AuthStatusModal } from "@/state/ui/AuthStatusModal";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider store={reduxStore}>
      <ThemeProvider>
        <SettingsDriver />
        <SessionProvider>
          <AuthGate>
            <GameLifecycle />
            {children}
            <AuthStatusModal />
          </AuthGate>
        </SessionProvider>
      </ThemeProvider>
    </ReduxProvider>
  );
}
