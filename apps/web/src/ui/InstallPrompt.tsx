"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import "./install-prompt.css";

const DISMISS_KEY = "vcell:installPrompt:dismissed";

type DeferredPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as NavigatorWithStandalone).standalone === true
  );
}

function isMobileUserAgent(userAgent: string): boolean {
  return /android|iphone|ipad|ipod|mobile/i.test(userAgent);
}

function isIosSafari(userAgent: string): boolean {
  return (
    /iphone|ipad|ipod/i.test(userAgent) &&
    /safari/i.test(userAgent) &&
    !/crios|fxios|edgios/i.test(userAgent)
  );
}

function isAndroid(userAgent: string): boolean {
  return /android/i.test(userAgent);
}

function readInstallDebugFlag(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return new URLSearchParams(window.location.search).get("install-debug") === "1";
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    if (process.env.NODE_ENV !== "production") return true;
    return window.localStorage.getItem(DISMISS_KEY) === "true";
  });
  const [installEvent, setInstallEvent] = useState<DeferredPromptEvent | null>(
    null
  );
  const [promptMode, setPromptMode] = useState<"ios" | "android" | null>(() => {
    if (typeof window === "undefined") return null;
    if (process.env.NODE_ENV !== "production") return null;

    const userAgent = window.navigator.userAgent;
    if (isIosSafari(userAgent)) return "ios";
    if (isAndroid(userAgent)) return "android";
    return null;
  });
  const [beforeInstallPromptSeen, setBeforeInstallPromptSeen] = useState(false);
  const [appInstalledSeen, setAppInstalledSeen] = useState(false);
  const [installDebugEnabled] = useState(readInstallDebugFlag);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setBeforeInstallPromptSeen(true);
      setInstallEvent(event as DeferredPromptEvent);
      setPromptMode("android");
    };

    const onAppInstalled = () => {
      setAppInstalledSeen(true);
      setInstallEvent(null);
      setDismissed(true);
      window.localStorage.setItem(DISMISS_KEY, "true");
    };

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const onDisplayModeChange = () => {
      if (mediaQuery.matches) {
        setDismissed(true);
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    mediaQuery.addEventListener("change", onDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      mediaQuery.removeEventListener("change", onDisplayModeChange);
    };
  }, []);

  const shouldShow = useMemo(() => {
    if (typeof window === "undefined") return false;
    if (process.env.NODE_ENV !== "production") return false;
    if (dismissed) return false;
    if (isStandalone()) return false;
    if (pathname !== "/game") return false;
    if (!isMobileUserAgent(window.navigator.userAgent)) return false;

    return promptMode === "ios" || promptMode === "android";
  }, [dismissed, pathname, promptMode]);
  const directPromptAvailable =
    promptMode === "android" && installEvent !== null;
  const debugSnapshot = useMemo(() => {
    if (typeof window === "undefined") return null;

    return {
      appInstalledSeen,
      beforeInstallPromptSeen,
      deferredPromptCaptured: installEvent !== null,
      directPromptAvailable,
      dismissed,
      isStandalone: isStandalone(),
      mobileUserAgent: isMobileUserAgent(window.navigator.userAgent),
      pathname,
      promptMode,
      userAgent: window.navigator.userAgent
    };
  }, [
    appInstalledSeen,
    beforeInstallPromptSeen,
    dismissed,
    directPromptAvailable,
    installEvent,
    pathname,
    promptMode
  ]);

  const dismiss = () => {
    setDismissed(true);
    window.localStorage.setItem(DISMISS_KEY, "true");
  };

  const handleInstall = async () => {
    if (!installEvent) return;

    await installEvent.prompt();
    const result = await installEvent.userChoice;
    if (result.outcome === "accepted") {
      dismiss();
      return;
    }

    setInstallEvent(null);
  };

  if (!shouldShow) return null;

  const canPromptDirectly = promptMode === "android" && installEvent;

  return (
    <div className="install-prompt" role="status" aria-live="polite">
      <div className="max-width-container install-prompt__inner">
        <p className="install-prompt__text">
          Install V-Cell for quicker launches and reliable airplane-mode play.
          {promptMode === "ios"
            ? " On iPhone, tap Share and choose Add to Home Screen."
            : " On Android, use Install if prompted, or add it from the browser menu."}
        </p>

        <div className="install-prompt__actions">
          {canPromptDirectly ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                handleInstall().catch((error) => {
                  console.error("[install prompt] failed", error);
                });
              }}
            >
              Install
            </button>
          ) : null}

          <button type="button" className="btn btn--ghost" onClick={dismiss}>
            Dismiss
          </button>
        </div>

        {installDebugEnabled && debugSnapshot ? (
          <pre className="install-prompt__debug">
            {JSON.stringify(debugSnapshot, null, 2)}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
