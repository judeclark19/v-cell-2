"use client";

import { useEffect, useLayoutEffect, useId, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useReducedMotionEnabled } from "@/state/ui/motionPreference";
import { selectMotionPreference } from "@/state/ui/uiSlice";
import { SignupTabContent } from "./SignupTabContent";
import { LoginTabContent } from "./LoginTabContent";
import { useLoginAuthFlows } from "./useLoginAuthFlows";
import { AuthTabsShell, AuthTabTitle } from "./AuthTabsShell";

const TABS = [
  { id: "login", label: "Login" },
  { id: "signup", label: "Sign up" }
] as const;

type TabId = (typeof TABS)[number]["id"];

function isTabId(value: string): value is TabId {
  return value === "login" || value === "signup";
}

function readHashTab(): TabId | null {
  if (typeof window === "undefined") return null;

  const hash = window.location.hash.replace(/^#/, "");
  return isTabId(hash) ? hash : null;
}

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
  const [activeTab, setActiveTab] = useState<TabId>(
    () => readHashTab() ?? "login"
  );
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const panelRefs = useRef<Record<TabId, HTMLElement | null>>({
    login: null,
    signup: null
  });
  const motionPreference = useSelector(selectMotionPreference);
  const shouldReduceMotion = useReducedMotionEnabled(motionPreference);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);
  const [isHeightReady, setIsHeightReady] = useState(false);

  useEffect(() => {
    const syncFromHash = () => {
      const hashTab = readHashTab();
      if (hashTab) {
        setActiveTab(hashTab);
      }
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const nextHash = `#${activeTab}`;
    if (window.location.hash === nextHash) return;

    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}${nextHash}`
    );
  }, [activeTab]);

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
        <AuthTabTitle>
          Login
        </AuthTabTitle>
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
        <AuthTabTitle>
          Sign up
        </AuthTabTitle>
      ),
      content: <SignupTabContent isOffline={isOffline} authFlows={authFlows} />
    }
  ];

  return (
    <AuthTabsShell
      activeId={activeTab}
      animated={isHeightReady && !shouldReduceMotion}
      baseId={baseId}
      items={items}
      onChange={(id) => setActiveTab(id as TabId)}
      onKeyDown={onKeyDown}
      panelHeight={panelHeight}
      panelRefs={panelRefs}
      tabRefs={tabRefs}
    />
  );
}
