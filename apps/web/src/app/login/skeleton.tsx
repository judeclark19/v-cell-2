"use client";

import {
  GuestPlayCopy,
  GuestPlayNotice,
  LoginPageStack
} from "@vcell/ui";
import styled from "styled-components";
import {
  SkeletonBlock,
  SkeletonButtonBlock,
  SkeletonInputField,
  SkeletonTabTitle,
  SkeletonTextLines
} from "@/ui/RouteLoading.shared";
import { AuthTabsShell } from "./AuthTabsShell";
import { LoginTabLayout } from "./LoginTabLayout";

const GuestNoticeSkeleton = styled(GuestPlayNotice)`
  border: 1px solid var(--border);
  border-radius: 16px;
`;

const NoticeCopySkeleton = styled(GuestPlayCopy)`
  width: 100%;
`;

const GuestButtonSkeleton = styled(SkeletonButtonBlock)`
  flex: 0 0 164px;
  width: 164px;

  @media (max-width: 640px) {
    flex-basis: auto;
    width: 100%;
  }
`;

const GoogleButtonSkeleton = styled(SkeletonButtonBlock)`
  border-radius: 999px;
`;

function LoginPanelSkeleton() {
  return (
    <LoginTabLayout
      intro={
        <div style={{ marginBottom: 36 }}>
          <SkeletonTextLines widths={["92%", "78%"]} />
        </div>
      }
      googleButton={<GoogleButtonSkeleton />}
      submit={<SkeletonButtonBlock />}
      footer={
        <SkeletonBlock $height={14} $width={132} $radius="999px" />
      }
    >
      <SkeletonInputField labelWidth={54} />
      <SkeletonInputField labelWidth={78} />
    </LoginTabLayout>
  );
}

export function LoginRouteLoading() {
  return (
    <LoginPageStack
      role="status"
      aria-live="polite"
      aria-label="Loading login"
    >
      <GuestNoticeSkeleton aria-label="Guest play option">
        <NoticeCopySkeleton>
          <strong>
            <SkeletonBlock $height={22} $width="36%" $radius="999px" />
          </strong>
          <SkeletonTextLines widths={["82%", "70%"]} />
        </NoticeCopySkeleton>
        <GuestButtonSkeleton />
      </GuestNoticeSkeleton>

      <AuthTabsShell
        activeId="login"
        baseId="auth-loading"
        items={[
          {
            id: "login",
            label: <SkeletonTabTitle as="h1" width={84} />,
            content: <LoginPanelSkeleton />
          },
          {
            id: "signup",
            label: <SkeletonTabTitle as="h1" width={98} />,
            content: null
          }
        ]}
        onChange={() => undefined}
      />
    </LoginPageStack>
  );
}
