"use client";

import { Panel } from "@vcell/ui";
import { useLayoutEffect, useId, useRef, useState } from "react";
import "./auth-tabs.css";
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

  return (
    <Panel className="auth-card">
      <div
        role="tablist"
        aria-label="Authentication options"
        className="auth-tabs"
      >
        {TABS.map((tab, index) => {
          const selected = activeTab === tab.id;
          const tabId = `${baseId}-tab-${tab.id}`;
          const panelId = `${baseId}-panel-${tab.id}`;

          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              id={tabId}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              className={selected ? "tab is-active" : "tab"}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => onKeyDown(e, index)}
            >
              <h1
                style={{
                  fontSize: 24,
                  marginBottom: 0
                }}
              >
                {tab.label}
              </h1>
            </button>
          );
        })}
      </div>

      <div
        className={
          isHeightReady && !shouldReduceMotion
            ? "auth-tab-panels is-animated"
            : "auth-tab-panels"
        }
        style={panelHeight == null ? undefined : { height: `${panelHeight}px` }}
      >
        <section
          ref={(el) => {
            panelRefs.current.login = el;
          }}
          id={`${baseId}-panel-login`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-login`}
          hidden={activeTab !== "login"}
          className="tab-panel"
        >
          <LoginTabContent
            nextPath={nextPath}
            isOffline={isOffline}
            authFlows={authFlows}
          />
        </section>

        <section
          ref={(el) => {
            panelRefs.current.signup = el;
          }}
          id={`${baseId}-panel-signup`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-signup`}
          hidden={activeTab !== "signup"}
          className="tab-panel"
        >
          <SignupTabContent isOffline={isOffline} authFlows={authFlows} />
        </section>
      </div>
    </Panel>
  );
}
