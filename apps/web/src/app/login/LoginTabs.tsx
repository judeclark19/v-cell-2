"use client";

import { useId, useRef, useState } from "react";
import "./login-tabs.css";

const TABS = [
  { id: "login", label: "Login" },
  { id: "signup", label: "Sign up" }
] as const;

type TabId = (typeof TABS)[number]["id"];

export function LoginTabs() {
  const baseId = useId();
  const [activeTab, setActiveTab] = useState<TabId>("login");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

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
    <div className="paper auth-card">
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
              {tab.label}
            </button>
          );
        })}
      </div>

      <section
        id={`${baseId}-panel-login`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-login`}
        hidden={activeTab !== "login"}
        className="tab-panel"
      >
        <h2>Login content</h2>
        {/* login form */}
      </section>

      <section
        id={`${baseId}-panel-signup`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-signup`}
        hidden={activeTab !== "signup"}
        className="tab-panel"
      >
        <h2>sign up content</h2>
        {/* signup form */}
      </section>
    </div>
  );
}
