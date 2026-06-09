"use client";

import styled, { css, keyframes } from "styled-components";
import type React from "react";
import {
  Field,
  UserStatsTable,
  UserStatsTableCell,
  UserStatsTableHeaderCell,
  UserStatsTableRow,
  UserStatsTableScroller
} from "@vcell/ui";

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

export const SkeletonTextLine = styled.span<{
  $height: number | string;
  $radius?: string;
  $width?: number | string;
}>`
  ${shimmer}
  display: block;
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

const SkeletonTitleBlock = styled.span<{
  $width: number;
}>`
  ${shimmer}
  border-radius: 999px;
  display: block;
  flex: 0 0 auto;
  height: 48px;
  margin-left: auto;
  margin-right: auto;
  max-width: 70vw;
  width: ${({ $width }) => `${$width}px`};
`;

export function SkeletonTitleText({
  label,
  width = 220
}: {
  label: string;
  width?: number;
}) {
  return (
    <>
      <HiddenLabel>{label}</HiddenLabel>
      <SkeletonTitleBlock aria-hidden="true" $width={width} />
    </>
  );
}

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
        <SkeletonTitleText label={label} width={width} />
      </TitleHeading>
    </TitleHeader>
  );
}

export const SkeletonHeadingBlock = styled(SkeletonTextLine).attrs({
  $height: 28
})`
  margin: 0.83em 0;
`;

export const SkeletonSubheadingBlock = styled(SkeletonTextLine).attrs({
  $height: 22
})`
  margin: 1em 0;
`;

const SkeletonParagraph = styled.p`
  display: grid;
  gap: 0.35rem;
`;

const SkeletonList = styled.ul`
  display: grid;
  gap: 0.5rem;
  padding-left: 1.5rem;
`;

const SkeletonListItem = styled.li`
  padding-left: 0.1rem;
`;

export function SkeletonTextLines({
  widths
}: {
  widths: Array<number | string>;
}) {
  return (
    <SkeletonParagraph>
      {widths.map((width, index) => (
        <SkeletonTextLine
          key={`paragraph-line-${index}`}
          $height={18}
          $width={width}
        />
      ))}
    </SkeletonParagraph>
  );
}

export function SkeletonListLines({
  widths
}: {
  widths: Array<number | string>;
}) {
  return (
    <SkeletonList>
      {widths.map((width, index) => (
        <SkeletonListItem key={`list-line-${index}`}>
          <SkeletonBlock $height={18} $width={width} />
        </SkeletonListItem>
      ))}
    </SkeletonList>
  );
}

const SkeletonSelectBlock = styled(SkeletonBlock).attrs({
  $height: 36,
  $radius: "var(--control-radius)",
  $width: "100%"
})``;

const SkeletonInputBlock = styled(SkeletonBlock).attrs({
  $height: 40,
  $radius: "var(--control-radius)",
  $width: "100%"
})``;

export const SkeletonButtonBlock = styled(SkeletonBlock).attrs({
  $height: 40,
  $radius: "var(--btn-radius)",
  $width: "100%"
})``;

const SkeletonTabTitleRoot = styled.h2`
  font-size: 24px;
  margin-bottom: 0;
`;

const SkeletonTabTitleBlock = styled(SkeletonTextLine).attrs({
  $height: 29,
  $radius: "999px"
})`
  margin: 0 auto;
`;

export function SkeletonTabTitle({
  as = "h2",
  width
}: {
  as?: React.ElementType;
  width: number | string;
}) {
  return (
    <SkeletonTabTitleRoot as={as}>
      <SkeletonTabTitleBlock $width={width} />
    </SkeletonTabTitleRoot>
  );
}

const SkeletonFormLabel = styled.label`
  display: block;
  margin-bottom: 10px;

  &:last-of-type {
    margin-bottom: 14px;
  }
`;

const SkeletonFormLabelText = styled(SkeletonTextLine).attrs({
  $height: 16,
  $radius: "999px"
})`
  display: block;
  margin-bottom: 6px;
`;

export function SkeletonInputField({
  labelWidth,
  marginBottom = 10
}: {
  labelWidth: number | string;
  marginBottom?: number;
}) {
  return (
    <SkeletonFormLabel style={{ marginBottom }}>
      <SkeletonFormLabelText $width={labelWidth} />
      <SkeletonInputBlock />
    </SkeletonFormLabel>
  );
}

const SkeletonFieldLabel = styled(SkeletonTextLine).attrs({
  $height: 20,
  $radius: "999px"
})``;

const SkeletonFieldHint = styled(SkeletonTextLine).attrs({
  $height: 16
})``;

export function SkeletonSelectField({
  hintWidth,
  labelWidth
}: {
  hintWidth?: number | string;
  labelWidth: number | string;
}) {
  return (
    <Field
      label={<SkeletonFieldLabel $width={labelWidth} />}
      hint={hintWidth == null ? null : <SkeletonFieldHint $width={hintWidth} />}
    >
      <SkeletonSelectBlock />
    </Field>
  );
}

export function SkeletonStatsTable({
  columns = 5,
  rows = 4
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <UserStatsTableScroller>
      <UserStatsTable>
        <thead>
          <UserStatsTableRow>
            {Array.from({ length: columns }).map((_, index) => (
              <UserStatsTableHeaderCell key={`header-${index}`}>
                <SkeletonBlock
                  $height={16}
                  $radius="999px"
                  $width={index === 0 ? "72%" : "58%"}
                />
              </UserStatsTableHeaderCell>
            ))}
          </UserStatsTableRow>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <UserStatsTableRow key={`row-${rowIndex}`}>
              {Array.from({ length: columns }).map((_, columnIndex) => (
                <UserStatsTableCell key={`cell-${rowIndex}-${columnIndex}`}>
                  <SkeletonBlock
                    $height={18}
                    $radius="999px"
                    $width={columnIndex === 0 ? "78%" : "54%"}
                  />
                </UserStatsTableCell>
              ))}
            </UserStatsTableRow>
          ))}
        </tbody>
      </UserStatsTable>
    </UserStatsTableScroller>
  );
}
