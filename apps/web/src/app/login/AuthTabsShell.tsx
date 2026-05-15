"use client";

import { Panel, Tabs, type TabsProps } from "@vcell/ui";
import styled from "styled-components";

const AuthPanel = styled(Panel).attrs({
  className: "auth-card",
  maxWidth: 500
})`
  margin-left: auto;
  margin-right: auto;
  width: min(100%, 500px);
`;

export function AuthTabsShell({
  ...tabsProps
}: Omit<TabsProps, "ariaLabel" | "panelPadding">) {
  return (
    <AuthPanel>
      <Tabs
        {...tabsProps}
        ariaLabel="Authentication options"
        panelPadding="lg"
      />
    </AuthPanel>
  );
}

export const AuthTabTitle = styled.h1`
  font-size: 24px;
  margin-bottom: 0;
`;
