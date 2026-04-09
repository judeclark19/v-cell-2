"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import "./install-prompt.css";

const DISMISS_KEY = "vcell:installPrompt:dismissed";
const DEBUG_SESSION_KEY = "vcell:installPrompt:debugSession";

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
    return (
      new URLSearchParams(window.location.search).get("install-debug") === "1"
    );
  } catch {
    return false;
  }
}

function getDebugSessionInfo() {
  if (typeof window === "undefined") {
    return {
      firstSeenAt: null as string | null,
      reloadCount: 0
    };
  }

  try {
    const raw = window.sessionStorage.getItem(DEBUG_SESSION_KEY);
    const parsed = raw ? (JSON.parse(raw) as {
      firstSeenAt?: string | null;
      reloadCount?: number;
    }) : null;

    const next = {
      firstSeenAt: parsed?.firstSeenAt ?? new Date().toISOString(),
      reloadCount: (parsed?.reloadCount ?? 0) + 1
    };

    window.sessionStorage.setItem(DEBUG_SESSION_KEY, JSON.stringify(next));
    return next;
  } catch {
    return {
      firstSeenAt: null as string | null,
      reloadCount: 0
    };
  }
}

function getInitialServiceWorkerDebug() {
  if (typeof window === "undefined") {
    return {
      controller: false,
      registrationScope: null,
      registrationActive: false,
      supported: false
    };
  }

  const supported = "serviceWorker" in navigator;

  return {
    controller: supported ? navigator.serviceWorker.controller !== null : false,
    registrationScope: null,
    registrationActive: false,
    supported
  };
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
  const [debugSession] = useState(getDebugSessionInfo);
  const [beforeInstallPromptAt, setBeforeInstallPromptAt] = useState<
    string | null
  >(null);
  const [controllerChangedAt, setControllerChangedAt] = useState<string | null>(
    null
  );
  const [serviceWorkerDebug, setServiceWorkerDebug] = useState<{
    controller: boolean;
    registrationScope: string | null;
    registrationActive: boolean;
    supported: boolean;
  }>(getInitialServiceWorkerDebug);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setBeforeInstallPromptSeen(true);
      setBeforeInstallPromptAt(new Date().toISOString());
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

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    const updateServiceWorkerDebug = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (cancelled) return;

        setServiceWorkerDebug({
          controller: navigator.serviceWorker.controller !== null,
          registrationScope: registration?.scope ?? null,
          registrationActive: registration?.active != null,
          supported: true
        });
      } catch {
        if (cancelled) return;

        setServiceWorkerDebug({
          controller: navigator.serviceWorker.controller !== null,
          registrationScope: null,
          registrationActive: false,
          supported: true
        });
      }
    };

    updateServiceWorkerDebug().catch(() => undefined);

    const onControllerChange = () => {
      setControllerChangedAt(new Date().toISOString());
      updateServiceWorkerDebug().catch(() => undefined);
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker.ready
      .then(() => updateServiceWorkerDebug())
      .catch(() => undefined);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
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
      beforeInstallPromptAt,
      beforeInstallPromptSeen,
      controllerChangedAt,
      deferredPromptCaptured: installEvent !== null,
      debugSession,
      directPromptAvailable,
      dismissed,
      hasManifestLink:
        document.querySelector('link[rel="manifest"]')?.getAttribute("href") ??
        null,
      isStandalone: isStandalone(),
      locationHref: window.location.href,
      locationOrigin: window.location.origin,
      locationProtocol: window.location.protocol,
      mobileUserAgent: isMobileUserAgent(window.navigator.userAgent),
      navigatorStandalone:
        (window.navigator as NavigatorWithStandalone).standalone ?? null,
      pathname,
      promptMode,
      serviceWorker: serviceWorkerDebug,
      userAgent: window.navigator.userAgent
    };
  }, [
    appInstalledSeen,
    beforeInstallPromptAt,
    beforeInstallPromptSeen,
    controllerChangedAt,
    debugSession,
    dismissed,
    directPromptAvailable,
    installEvent,
    pathname,
    promptMode,
    serviceWorkerDebug
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

  console.log("installEvent", installEvent);
  if (!shouldShow) return null;

  const canPromptDirectly = promptMode === "android" && installEvent;

  return (
    <div className="install-prompt" role="status" aria-live="polite">
      <div className="max-width-container install-prompt__inner">
        <p className="install-prompt__text">
          Install V-Cell for quicker launches and reliable airplane-mode play.
          {promptMode === "ios"
            ? " On iPhone, tap Share and choose Add to Home Screen."
            : canPromptDirectly
              ? " On Android, tap Install to open Chrome's install prompt."
              : " On Android, Chrome has not offered an install prompt yet. Try the browser menu to install, or keep using the site and check again later."}
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
