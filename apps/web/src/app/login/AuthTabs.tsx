"use client";

import { Panel, Tabs } from "@vcell/ui";
import { useLayoutEffect, useId, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useReducedMotionEnabled } from "@/state/ui/motionPreference";
import { selectMotionPreference } from "@/state/ui/uiSlice";
import { SignupTabContent } from "./SignupTabContent";
import { LoginTabContent } from "./LoginTabContent";
import { useLoginAuthFlows } from "./useLoginAuthFlows";

const TABS = [
  { id: "login", label: "Login" },
  { id: "signup", label: "Sign up" }
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AuthTabs({
  nextPath,
  isOffline,
  authFlows
}: {
  nextPath: string;
  isOffline: boolean;
  authFlows: ReturnType<typeof useLoginAuthFlows>;
}) {
  const baseId = useId();
  const [activeTab, setActiveTab] = useState<TabId>("login");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const panelRefs = useRef<Record<TabId, HTMLElement | null>>({
    login: null,
    signup: null
  });
  const motionPreference = useSelector(selectMotionPreference);
  const shouldReduceMotion = useReducedMotionEnabled(motionPreference);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);
  const [isHeightReady, setIsHeightReady] = useState(false);

  useLayoutEffect(() => {
    const activePanel = panelRefs.current[activeTab];
    if (!activePanel) return;

    const updateHeight = () => {
      setPanelHeight(activePanel.getBoundingClientRect().height);
      setIsHeightReady(true);
    };

    updateHeight();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(activePanel);
    return () => observer.disconnect();
  }, [activeTab]);

  function focusTab(nextIndex: number) {
    const clamped = (nextIndex + TABS.length) % TABS.length;
    tabRefs.current[clamped]?.focus();
    setActiveTab(TABS[clamped].id);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        focusTab(index + 1);
        break;
      case "ArrowLeft":
        e.preventDefault();
        focusTab(index - 1);
        break;
      case "Home":
        e.preventDefault();
        focusTab(0);
        break;
      case "End":
        e.preventDefault();
        focusTab(TABS.length - 1);
        break;
    }
  }

  const items = [
    {
      id: "login",
      label: (
        <h1
          style={{
            fontSize: 24,
            marginBottom: 0
          }}
        >
          Login
        </h1>
      ),
      content: (
        <LoginTabContent
          nextPath={nextPath}
          isOffline={isOffline}
          authFlows={authFlows}
        />
      )
    },
    {
      id: "signup",
      label: (
        <h1
          style={{
            fontSize: 24,
            marginBottom: 0
          }}
        >
          Sign up
        </h1>
      ),
      content: <SignupTabContent isOffline={isOffline} authFlows={authFlows} />
    }
  ];

  return (
    <Panel className="auth-card" maxWidth={500} style={{ margin: "0 auto" }}>
      <Tabs
        activeId={activeTab}
        animated={isHeightReady && !shouldReduceMotion}
        ariaLabel="Authentication options"
        baseId={baseId}
        items={items}
        onChange={(id) => setActiveTab(id as TabId)}
        onKeyDown={onKeyDown}
        panelHeight={panelHeight}
        panelPadding="lg"
        panelRefs={panelRefs}
        tabRefs={tabRefs}
      />
    </Panel>
  );
}
