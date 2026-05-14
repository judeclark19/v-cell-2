"use client";

import styled, { css, keyframes } from "styled-components";

const shimmerMotion = keyframes`
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
`;

export const shimmer = css`
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.16) 0%,
    rgba(255, 255, 255, 0.34) 50%,
    rgba(255, 255, 255, 0.16) 100%
  );
  background-size: 200% 100%;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
  animation: ${shimmerMotion} 1.2s ease-in-out infinite;
`;

export function LoadingStyles() {
  return null;
}

export const SkeletonBlock = styled.div<{
  $height: number | string;
  $radius?: string;
  $width?: number | string;
}>`
  ${shimmer}
  height: ${({ $height }) =>
    typeof $height === "number" ? `${$height}px` : $height};
  width: ${({ $width = "100%" }) =>
    typeof $width === "number" ? `${$width}px` : $width};
  border-radius: ${({ $radius = "12px" }) => $radius};
`;

const HiddenLabel = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
`;

const TitleHeader = styled.header``;

const TitleHeading = styled.h1`
  display: flex;
  justify-content: center;
  text-align: center;
  width: 100%;
`;

const TitleBlock = styled.span<{
  $width: number;
}>`
  ${shimmer}
  border-radius: 999px;
  display: block;
  flex: 0 0 auto;
  height: 48px;
  max-width: 70vw;
  width: ${({ $width }) => `${$width}px`};
`;

export function RouteTitleSkeleton({
  label,
  width = 220
}: {
  label: string;
  width?: number;
}) {
  return (
    <TitleHeader>
      <TitleHeading>
        <HiddenLabel>{label}</HiddenLabel>
        <TitleBlock aria-hidden="true" $width={width} />
      </TitleHeading>
    </TitleHeader>
  );
}
