"use client";

import React from "react";
import { SessionProvider } from "@/state/session/SessionProvider";
import { GameProvider } from "@/state/game/GameProvider"; // or wherever you put it

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GameProvider>{children}</GameProvider>
    </SessionProvider>
  );
}
