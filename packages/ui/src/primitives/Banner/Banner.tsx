"use client";

import * as React from "react";
import {
  BannerActions,
  BannerInner,
  BannerRoot,
  BannerText
} from "./Banner.styles";

export type BannerProps = React.HTMLAttributes<HTMLDivElement> & {
  sticky?: boolean;
  tone?: "prompt" | "status";
};

export function Banner({
  children,
  sticky = false,
  tone = "prompt",
  ...props
}: BannerProps) {
  return (
    <BannerRoot {...props} $sticky={sticky} $tone={tone}>
      {children}
    </BannerRoot>
  );
}

export { BannerActions, BannerInner, BannerText };
