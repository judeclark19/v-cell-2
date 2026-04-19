"use client";

import * as React from "react";
import {
  TabButton,
  TabPanel,
  TabsList,
  TabsPanels
} from "./Tabs.styles";

export type TabsPanelPadding = "none" | "md" | "lg";

export type TabsItem = {
  content: React.ReactNode;
  id: string;
  label: React.ReactNode;
};

export type TabsProps = {
  activeId: string;
  animated?: boolean;
  ariaLabel: string;
  baseId: string;
  items: TabsItem[];
  onChange: (id: string) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => void;
  panelHeight?: number | null;
  panelPadding?: TabsPanelPadding;
  panelRefs?: React.MutableRefObject<Record<string, HTMLElement | null>>;
  tabRefs?: React.MutableRefObject<Array<HTMLButtonElement | null>>;
};

export function Tabs({
  activeId,
  animated = false,
  ariaLabel,
  baseId,
  items,
  onChange,
  onKeyDown,
  panelHeight,
  panelPadding = "none",
  panelRefs,
  tabRefs
}: TabsProps) {
  return (
    <>
      <TabsList role="tablist" aria-label={ariaLabel}>
        {items.map((item, index) => {
          const selected = activeId === item.id;
          const tabId = `${baseId}-tab-${item.id}`;
          const panelId = `${baseId}-panel-${item.id}`;

          return (
            <TabButton
              key={item.id}
              ref={(el) => {
                if (tabRefs) tabRefs.current[index] = el;
              }}
              id={tabId}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              $selected={selected}
              onClick={() => onChange(item.id)}
              onKeyDown={(event) => onKeyDown?.(event, index)}
            >
              {item.label}
            </TabButton>
          );
        })}
      </TabsList>

      <TabsPanels
        $animated={animated}
        style={panelHeight == null ? undefined : { height: `${panelHeight}px` }}
      >
        {items.map((item) => (
          <TabPanel
            key={item.id}
            ref={(el) => {
              if (panelRefs) panelRefs.current[item.id] = el;
            }}
            id={`${baseId}-panel-${item.id}`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-${item.id}`}
            hidden={activeId !== item.id}
            $padding={panelPadding}
          >
            {item.content}
          </TabPanel>
        ))}
      </TabsPanels>
    </>
  );
}
