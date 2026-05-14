"use client";

import { GameRouteLoading } from "@/app/game/skeleton";
import { HowToPlayRouteLoading } from "@/app/how-to-play/skeleton";
import { LoginRouteLoading } from "@/app/login/skeleton";
import { SettingsRouteLoading } from "@/app/settings/skeleton";
import { StatsRouteLoading } from "@/app/stats/skeleton";
import { Panel } from "@vcell/ui";
import styled from "styled-components";
import {
  LoadingStyles,
  RouteTitleSkeleton,
  SkeletonBlock
} from "@/ui/RouteLoading.shared";

const GenericMain = styled.main`
  display: block;
`;

const GenericPanel = styled(Panel).attrs({
  as: "section",
  padding: "lg"
})``;

const GenericContent = styled.div`
  display: grid;
  gap: 1rem;
`;

function GenericPanelLoading({ label }: { label: string }) {
  return (
    <>
      <LoadingStyles />
      <RouteTitleSkeleton label={label} />
      <GenericMain
        role="status"
        aria-live="polite"
        aria-label={`Loading ${label}`}
      >
        <GenericPanel>
          <GenericContent>
            <SkeletonBlock $height={32} $width="45%" />
            <SkeletonBlock $height={20} $width="82%" />
            <SkeletonBlock $height={20} $width="74%" />
            <SkeletonBlock $height={20} $width="88%" />
            <SkeletonBlock $height={44} $width="64%" />
            <SkeletonBlock $height={20} $width="70%" />
          </GenericContent>
        </GenericPanel>
      </GenericMain>
    </>
  );
}

export function RouteLoading({ pathname }: { pathname: string }) {
  switch (pathname) {
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
    default:
      return <GenericPanelLoading label="Loading" />;
  }
}
