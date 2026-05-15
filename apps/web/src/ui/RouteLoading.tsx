"use client";

import { GameRouteLoading } from "@/app/game/skeleton";
import { ForgotPasswordRouteLoading } from "@/app/forgot-password/skeleton";
import { HowToPlayRouteLoading } from "@/app/how-to-play/skeleton";
import { LoginRouteLoading } from "@/app/login/skeleton";
import { ResetPasswordRouteLoading } from "@/app/reset-password/skeleton";
import { SettingsRouteLoading } from "@/app/settings/skeleton";
import { StatsRouteLoading } from "@/app/stats/skeleton";

export function RouteLoading({ pathname }: { pathname: string }) {
  switch (pathname) {
    case "/":
      return <LoginRouteLoading />;
    case "/stats":
      return <StatsRouteLoading />;
    case "/game":
      return <GameRouteLoading />;
    case "/how-to-play":
      return <HowToPlayRouteLoading />;
    case "/settings":
      return <SettingsRouteLoading />;
    case "/login":
      return <LoginRouteLoading />;
    case "/forgot-password":
      return <ForgotPasswordRouteLoading />;
    case "/reset-password":
      return <ResetPasswordRouteLoading />;
    default:
      return null;
  }
}
