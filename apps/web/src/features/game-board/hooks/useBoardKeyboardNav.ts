import { useCallback, useEffect, useRef, useState } from "react";

type BoardNavNodeMeta = {
  region: "tableau" | "freecell" | "foundation";
  col: number;
  row: 0 | 1 | 2;
  tableauCol?: number;
  tableauIndex?: number;
};

type UseBoardKeyboardNavArgs = {
  state: unknown;
  playable: unknown;
  kbCarrying: boolean;
  getNodeMeta: (el: HTMLElement) => BoardNavNodeMeta | null;
};

export function useBoardKeyboardNav({
  state,
  playable,
  kbCarrying,
  getNodeMeta
}: UseBoardKeyboardNavArgs) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const focusablesRef = useRef<HTMLElement[]>([]);
  const [activeFocusIndex, setActiveFocusIndex] = useState(0);
  const hadBoardFocusRef = useRef(false);
  const lastFocusPointRef = useRef<{ x: number; y: number } | null>(null);

  const getActiveFocusableEl = useCallback(() => {
    const els = focusablesRef.current;
    if (!els.length) return null;

    const activeEl = document.activeElement as HTMLElement | null;
    if (activeEl && els.includes(activeEl)) return activeEl;

    return els[Math.max(0, Math.min(activeFocusIndex, els.length - 1))] ?? null;
  }, [activeFocusIndex]);

  const getCenter = useCallback((el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, []);

  const refreshKeyboardFocusables = useCallback(() => {
    const root = boardRef.current;
    if (!root) return;

    // Keyboard focusables:
    // - playable cards (".card.is-playable")
    // - while carrying (Space-toggle), also allow explicit empty slots opted in via
    //   data-kb-focusable="true" (e.g., empty drop targets)
    const selector = kbCarrying
      ? '.card.is-playable, [data-kb-focusable="true"]'
      : ".card.is-playable";

    const els = Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
      (el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-disabled")
    );

    focusablesRef.current = els;

    // Clamp active index to the new list.
    // Schedule the state update to avoid sync setState inside effects.
    const nextIndex =
      els.length === 0 ? 0 : Math.min(activeFocusIndex, els.length - 1);
    if (nextIndex !== activeFocusIndex) {
      requestAnimationFrame(() => setActiveFocusIndex(nextIndex));
    }
  }, [kbCarrying, activeFocusIndex]);

  const focusByIndex = useCallback((idx: number) => {
    const els = focusablesRef.current;
    if (!els.length) return;
    const next = els[Math.max(0, Math.min(idx, els.length - 1))];
    if (!next) return;
    next.focus();
  }, []);

  const focusFirstPlayable = useCallback(() => {
    refreshKeyboardFocusables();
    const els = focusablesRef.current;
    if (els.length === 0) return;

    setActiveFocusIndex(0);
    requestAnimationFrame(() => els[0]?.focus());
  }, [refreshKeyboardFocusables]);

  const focusElIfFocusable = useCallback(
    (el: HTMLElement | null) => {
      refreshKeyboardFocusables();
      if (!el) return false;

      const els = focusablesRef.current;
      const idx = els.indexOf(el);
      if (idx < 0) return false;

      setActiveFocusIndex(idx);
      requestAnimationFrame(() => el.focus());
      return true;
    },
    [refreshKeyboardFocusables]
  );

  const focusNearestToLastPoint = useCallback(() => {
    const els = focusablesRef.current;
    const p = lastFocusPointRef.current;
    if (!els.length || !p) return;

    let bestIdx = 0;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let i = 0; i < els.length; i++) {
      const c = getCenter(els[i]);
      const dx = Math.abs(c.x - p.x);
      const dy = Math.abs(c.y - p.y);

      // Strongly prefer staying in the same column (x alignment), then nearest y.
      const score = dx * 1000 + dy;
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    setActiveFocusIndex(bestIdx);
    requestAnimationFrame(() => focusByIndex(bestIdx));
  }, [focusByIndex, getCenter]);

  // Keep the focusable list in sync with state/playable/carry changes,
  // and restore focus if a move removed the focused element.
  useEffect(() => {
    refreshKeyboardFocusables();

    const root = boardRef.current;
    const els = focusablesRef.current;
    if (!root || els.length === 0) return;

    const activeEl = document.activeElement as HTMLElement | null;
    const focusIsOnPlayable = !!(activeEl && els.includes(activeEl));

    if (hadBoardFocusRef.current && !focusIsOnPlayable) {
      // Schedule to avoid setState directly within effect body.
      requestAnimationFrame(() => focusNearestToLastPoint());
    }
  }, [
    refreshKeyboardFocusables,
    state,
    playable,
    activeFocusIndex,
    focusNearestToLastPoint
  ]);

  // Apply roving tabindex based on activeFocusIndex.
  useEffect(() => {
    const els = focusablesRef.current;
    if (els.length === 0) return;

    els.forEach((el, i) => {
      el.tabIndex = i === activeFocusIndex ? 0 : -1;
    });
  }, [activeFocusIndex]);

  useEffect(() => {
    const el = getActiveFocusableEl();
    if (!el) return;

    const meta = getNodeMeta(el);
    // Sanity check: confirm we can classify the currently focused element.
    // Use debug to keep noise low.
    console.debug("[kb-nav] active", {
      idx: activeFocusIndex,
      meta,
      ariaLabel: el.getAttribute("aria-label"),
      cardId: el.getAttribute("data-card-id") || el.dataset.cardId
    });
  }, [activeFocusIndex, kbCarrying, getActiveFocusableEl, getNodeMeta]);

  const findNextByDirection = useCallback(
    (dir: "left" | "right" | "up" | "down") => {
      const els = focusablesRef.current;
      if (!els.length) return;

      const fromEl = getActiveFocusableEl();
      if (!fromEl) return;

      const from = getCenter(fromEl);
      const fromMeta = getNodeMeta(fromEl);

      let bestIdx = -1;
      let bestScore = Number.POSITIVE_INFINITY;

      // Rule: Left/Right should stay within the same board region as the current focus.
      // This prevents tableau navigation from “sniping” into foundations/freecells based on geometry.
      // Up/Down may leave the region when appropriate.
      const restrictToSameRegion = dir === "left" || dir === "right";

      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        if (el === fromEl) continue;

        const toMeta = getNodeMeta(el);

        if (restrictToSameRegion) {
          // If we can classify both nodes, require same region.
          if (fromMeta && toMeta && toMeta.region !== fromMeta.region) continue;
        }

        const to = getCenter(el);
        const dx = to.x - from.x;
        const dy = to.y - from.y;

        const isInDir =
          (dir === "left" && dx < -1) ||
          (dir === "right" && dx > 1) ||
          (dir === "up" && dy < -1) ||
          (dir === "down" && dy > 1);

        if (!isInDir) continue;

        // For L/R: prioritize the nearest next column (|dx|), then |dy|.
        // For U/D: prioritize staying in the same column (|dx|), then move by |dy|.
        const primary = Math.abs(dx);
        const secondary = Math.abs(dy);

        const score = primary * 1000 + secondary;
        if (score < bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }

      if (bestIdx >= 0) {
        setActiveFocusIndex(bestIdx);
        requestAnimationFrame(() => focusByIndex(bestIdx));
      }
    },
    [focusByIndex, getCenter, getActiveFocusableEl, getNodeMeta]
  );

  const onBoardFocusCapture = useCallback(() => {
    // When focus enters the board and nothing inside is focused,
    // focus the current active element.
    const els = focusablesRef.current;
    if (!els.length) return;

    const activeEl = document.activeElement as HTMLElement | null;
    if (activeEl && els.includes(activeEl)) return;

    requestAnimationFrame(() => focusByIndex(activeFocusIndex));
  }, [activeFocusIndex, focusByIndex]);

  return {
    boardRef,
    focusablesRef,
    activeFocusIndex,
    setActiveFocusIndex,
    hadBoardFocusRef,
    lastFocusPointRef,
    getCenter,
    refreshKeyboardFocusables,
    focusByIndex,
    focusNearestToLastPoint,
    findNextByDirection,
    onBoardFocusCapture,
    focusFirstPlayable,
    focusElIfFocusable
  };
}
