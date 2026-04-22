"use client";

import * as React from "react";
import styled from "styled-components";
import { Panel, type PanelProps } from "@vcell/ui";

export const SettingsHeader = styled.header`
  text-align: center;
`;

export const SettingsPanels = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
  gap: 20px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const SettingsPanelContent = styled.div`
  min-width: 0;
  height: 100%;
  overflow-wrap: anywhere;

  & > * {
    min-width: 0;
  }
`;

export function SettingsPanel({ children, ...props }: PanelProps) {
  return React.createElement(
    Panel,
    props,
    React.createElement(SettingsPanelContent, null, children)
  );
}

export const SettingsFields = styled.div`
  display: grid;
  gap: 20px;
  min-width: 0;

  select,
  input,
  button {
    max-width: 100%;
  }
`;

export const SettingsHint = styled.p`
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
`;
