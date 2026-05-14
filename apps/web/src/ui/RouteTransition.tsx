"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { RouteLoading } from "@/ui/RouteLoading";

type RouteTransitionContextValue = {
  pendingPath: string | null;
  startRouteTransition: (href: string) => void;
};

const RouteTransitionContext =
  createContext<RouteTransitionContextValue | null>(null);

function normalizeInternalPath(href: string): string | null {
  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return null;
    return url.pathname;
  } catch {
    return href.startsWith("/") ? href.split("?")[0] : null;
  }
}

function shouldIgnoreClick(event: MouseEvent, anchor: HTMLAnchorElement) {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey ||
    anchor.target === "_blank" ||
    anchor.hasAttribute("download")
  );
}

export function RouteTransitionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  const startRouteTransition = useCallback(
    (href: string) => {
      const nextPath = normalizeInternalPath(href);
      if (!nextPath || nextPath === pathname) return;
      setPendingPath(nextPath);
    },
    [pathname]
  );

  useEffect(() => {
    if (pendingPath && pathname === pendingPath) {
      setPendingPath(null);
    }
  }, [pathname, pendingPath]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (shouldIgnoreClick(event, anchor)) return;

      startRouteTransition(anchor.href);
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [startRouteTransition]);

  const value = useMemo(
    () => ({ pendingPath, startRouteTransition }),
    [pendingPath, startRouteTransition]
  );

  return (
    <RouteTransitionContext.Provider value={value}>
      {children}
    </RouteTransitionContext.Provider>
  );
}

export function useRouteTransition() {
  const context = useContext(RouteTransitionContext);
  if (!context) {
    throw new Error(
      "useRouteTransition must be used within RouteTransitionProvider."
    );
  }
  return context;
}

export function useRouteTransitionRouter() {
  const router = useRouter();
  const { startRouteTransition } = useRouteTransition();

  return useMemo(
    () => ({
      push: (href: string) => {
        startRouteTransition(href);
        router.push(href);
      },
      replace: (href: string) => {
        startRouteTransition(href);
        router.replace(href);
      }
    }),
    [router, startRouteTransition]
  );
}

export function RouteTransitionBoundary({ children }: { children: ReactNode }) {
  const { pendingPath } = useRouteTransition();

  if (pendingPath) {
    return <RouteLoading pathname={pendingPath} />;
  }

  return <>{children}</>;
}
