import { useCallback, useEffect, useRef, useState } from "react";
import { BoardNodeMeta } from "../hooks/useBoardDomMapping";

type UseBoardKeyboardNavArgs<TState, TPlayable> = {
  state: TState;
  playable: TPlayable;
  kbCarrying: boolean;
  getNodeMeta: (el: HTMLElement) => BoardNodeMeta | null;
  isLegalDropTargetEl?: (el: HTMLElement) => boolean;
};

export function useBoardKeyboardNav<TState, TPlayable>({
  state,
  playable,
  kbCarrying,
  getNodeMeta,
  isLegalDropTargetEl
}: UseBoardKeyboardNavArgs<TState, TPlayable>) {
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

    // Keep declared drop targets in sync with the current focusable list.
    // Always clear first; we'll re-stamp below while carrying.
    root
      .querySelectorAll<HTMLElement>('[data-kb-drop-target="true"]')
      .forEach((el) => el.removeAttribute("data-kb-drop-target"));

    // Keyboard focusables are declared by the render layer.
    // This hook treats `data-kb-focusable="true"` as the single source of truth.
    const selector = '[data-kb-focusable="true"]';

    const els = Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
      (el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-disabled")
    );

    focusablesRef.current = els;

    if (kbCarrying && isLegalDropTargetEl) {
      els.forEach((el) => {
        if (isLegalDropTargetEl(el)) {
          el.setAttribute("data-kb-drop-target", "true");
        }
      });
    }

    // Clamp active index to the new list.
    // Schedule the state update to avoid sync setState inside effects.
    const nextIndex =
      els.length === 0 ? 0 : Math.min(activeFocusIndex, els.length - 1);
    if (nextIndex !== activeFocusIndex) {
      requestAnimationFrame(() => setActiveFocusIndex(nextIndex));
    }
  }, [activeFocusIndex, kbCarrying, isLegalDropTargetEl]);

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

      // Special case: when pressing DOWN from the bottom of a tableau column,
      // prefer entering the free-cells row rather than jumping to a longer neighboring column.
      if (dir === "down" && fromMeta?.region === "tableau") {
        // Try to identify the tableau position of the current focus.
        const fromPos = fromMeta as Extract<
          BoardNodeMeta,
          { region: "tableau" }
        >;

        const fromCol = fromPos.tableauCol;
        const fromRow = fromPos.tableauIndex;

        if (typeof fromCol === "number" && typeof fromRow === "number") {
          // If we're on the empty slot/container (-1), treat it as the bottom of the column.
          const effectiveFromRow =
            fromRow === -1 ? Number.POSITIVE_INFINITY : fromRow;

          // 1) First, try to move down within the same tableau column.
          let bestSameColIdx = -1;
          let bestSameColRow = Number.POSITIVE_INFINITY;

          for (let i = 0; i < els.length; i++) {
            const el = els[i];
            if (el === fromEl) continue;

            const meta = getNodeMeta(el);
            if (!meta || meta.region !== "tableau") continue;

            const pos = meta as Extract<BoardNodeMeta, { region: "tableau" }>;

            const col = pos.tableauCol;
            const row = pos.tableauIndex;

            if (col !== fromCol) continue;
            if (row <= effectiveFromRow) continue;

            if (row < bestSameColRow) {
              bestSameColRow = row;
              bestSameColIdx = i;
            }
          }

          if (bestSameColIdx >= 0) {
            setActiveFocusIndex(bestSameColIdx);
            requestAnimationFrame(() => focusByIndex(bestSameColIdx));
            return;
          }

          // 2) No lower focusable in this column. Jump to the nearest free cell by x-alignment.
          let bestFreeCellIdx = -1;
          let bestDx = Number.POSITIVE_INFINITY;

          for (let i = 0; i < els.length; i++) {
            const el = els[i];
            const meta = getNodeMeta(el);
            if (!meta || meta.region !== "freecell") continue;

            const c = getCenter(el);
            const dx = Math.abs(c.x - from.x);

            if (dx < bestDx) {
              bestDx = dx;
              bestFreeCellIdx = i;
            }
          }

          if (bestFreeCellIdx >= 0) {
            setActiveFocusIndex(bestFreeCellIdx);
            requestAnimationFrame(() => focusByIndex(bestFreeCellIdx));
            return;
          }
        }
      }

      // Rule: Left/Right should stay within the same board region as the current focus.
      // This prevents tableau navigation from “sniping” into foundations/freecells based on geometry.
      // Up/Down may leave the region when appropriate.
      const restrictToSameRegion = dir === "left" || dir === "right";

      // Tableau-specific rule: Left/Right should ALWAYS change columns.
      // Geometry-based dx checks can accidentally treat a slightly-offset lower card as “right”.
      if (
        (dir === "left" || dir === "right") &&
        fromMeta?.region === "tableau"
      ) {
        const fromPos = fromMeta as Extract<
          BoardNodeMeta,
          { region: "tableau" }
        >;
        const fromCol = fromPos.tableauCol;
        const fromRow = fromPos.tableauIndex;

        if (typeof fromCol === "number" && typeof fromRow === "number") {
          // If focused on an empty slot/container (-1), treat it as the bottom of the column.
          const effectiveFromRow =
            fromRow === -1 ? Number.POSITIVE_INFINITY : fromRow;

          let bestIdx = -1;
          let bestColDelta = Number.POSITIVE_INFINITY;
          let bestRowDelta = Number.POSITIVE_INFINITY;

          for (let i = 0; i < els.length; i++) {
            const el = els[i];
            if (el === fromEl) continue;

            const meta = getNodeMeta(el);
            if (!meta || meta.region !== "tableau") continue;

            const pos = meta as Extract<BoardNodeMeta, { region: "tableau" }>;
            const toCol = pos.tableauCol;
            const toRowRaw = pos.tableauIndex;

            if (typeof toCol !== "number" || typeof toRowRaw !== "number")
              continue;
            if (toCol === fromCol) continue; // L/R must change columns

            // Enforce direction by column index (not by pixel geometry).
            if (dir === "right" && toCol <= fromCol) continue;
            if (dir === "left" && toCol >= fromCol) continue;

            const colDelta = Math.abs(toCol - fromCol);
            const effectiveToRow =
              toRowRaw === -1 ? Number.POSITIVE_INFINITY : toRowRaw;
            const rowDelta = Math.abs(effectiveToRow - effectiveFromRow);

            // Prefer the nearest next column, then stay aligned by row.
            if (
              colDelta < bestColDelta ||
              (colDelta === bestColDelta && rowDelta < bestRowDelta)
            ) {
              bestColDelta = colDelta;
              bestRowDelta = rowDelta;
              bestIdx = i;
            }
          }

          if (bestIdx >= 0) {
            setActiveFocusIndex(bestIdx);
            requestAnimationFrame(() => focusByIndex(bestIdx));
            return;
          }
        }
      }

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

  const onBoardFocusCapture = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      const els = focusablesRef.current;
      if (!els.length) return;

      // Board container focused (empty click) => do nothing
      if (e.target === e.currentTarget) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      // If focus moved to something that is NOT one of our declared board focusables
      // (e.g. a control button like "Restart deal"), do NOT snap focus back into the board.
      const idx = els.indexOf(target);
      if (idx < 0) return;

      // Focus moved onto a board focusable: treat it as the new active index.
      if (idx !== activeFocusIndex) {
        setActiveFocusIndex(idx);
      }
    },
    [activeFocusIndex]
  );

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
