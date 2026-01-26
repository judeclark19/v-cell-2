import * as React from "react";

/**
 * Extracted FLIP animation logic from Board.tsx.
 *
 * This hook:
 * - Measures card rects before/after React commits.
 * - Animates position changes via a simple FLIP transform.
 * - Skips FLIP once after pointer-drag commits.
 * - Skips FLIP while pointer-drag overlay is active/pending.
 * - Supports "no flip" wrappers for newDeal/restart.
 * - Uses a ghost/clone animation for cards landing in foundation/freecell regions
 *   so the destination slot doesn't appear empty during the animation.
 *
 * Assumptions:
 * - Card DOM nodes include `.card[data-card-id="..."]`
 * - `getNodeMeta(el)` returns `{ region: "foundation" | "freecell" | ... } | null`
 */

export type BoardNodeMeta = {
  region: "tableau" | "freecell" | "foundation";
};

export type UseBoardFlipAnimationArgs = {
  boardRef: React.RefObject<HTMLElement | null>;

  // The board state object (used only as a dependency trigger, same as Board.tsx)
  state: unknown;

  // Seed gate used in Board.tsx; prevents weird initial flashes
  seedReady: boolean;

  // Keyboard carry state was in Board deps; keep it to match behavior
  kbCarrying: boolean;

  // Drag state used in Board
  drag: { active: boolean; pending: boolean };

  // From useBoardDomMapping; used to detect foundation/freecell landings
  getNodeMeta: (el: HTMLElement) => BoardNodeMeta | null;

  // The existing “skip FLIP once after pointer drag commits” ref from Board
  suppressFlipOnceRef: React.MutableRefObject<boolean>;

  /** Called when a FLIP run finishes (or is skipped). Useful for sequencing animations. */
  onFlipComplete?: (runId: number) => void;

  // Optional: supply your own rect store if you want to persist it elsewhere
  prevCardRectsRef?: React.MutableRefObject<Map<string, DOMRect>>;
};

export function useBoardFlipAnimation({
  boardRef,
  state,
  seedReady,
  kbCarrying,
  drag,
  getNodeMeta,
  suppressFlipOnceRef,
  onFlipComplete,
  prevCardRectsRef
}: UseBoardFlipAnimationArgs) {
  const [prevRects, setPrevRects] = React.useState<Map<string, DOMRect>>(() => {
    // Use an external ref only as an initial seed; do not mutate it (immutability lint).
    return prevCardRectsRef?.current ?? new Map();
  });

  // Provide a stable, read-only ref-like view for callers that expect `.current`.
  const rectsRef = React.useMemo(
    () =>
      ({
        get current() {
          return prevRects;
        }
      }) as React.MutableRefObject<Map<string, DOMRect>>,
    [prevRects]
  );

  // Track overlapping ghost flights per card id so we don't permanently restore to opacity "0".
  const ghostHideRef = React.useRef(
    new Map<string, { count: number; prevOpacity: string }>()
  );

  // Tokenize each FLIP run so stale transitionend handlers can't clobber newer runs.
  const flipRunIdRef = React.useRef(0);

  // --- FLIP animation for instant (non-drag) moves ---
  // Uses data-card-id on .card elements to animate from previous position to next.
  React.useLayoutEffect(() => {
    const root = boardRef.current;
    if (!root) return;

    // Respect reduced motion.
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const runId = ++flipRunIdRef.current;
    const runIdStr = String(runId);

    let pendingAnimations = 0;
    let didComplete = false;

    const maybeComplete = () => {
      if (didComplete) return;
      if (pendingAnimations <= 0) {
        didComplete = true;
        onFlipComplete?.(runId);
      }
    };

    const cardEls = Array.from(
      root.querySelectorAll<HTMLElement>(".card[data-card-id]")
    );

    // If any previous run left transient styles, ensure they don't accumulate forever.
    // We only clean up elements that still claim to belong to an older run.
    for (const el of cardEls) {
      // Self-heal: if a prior ghost flight hid the real card but cleanup was interrupted,
      // restore opacity at the start of a new run.
      if (el.dataset.ghostHidden === "1") {
        el.style.opacity = el.dataset.ghostPrevOpacity ?? "";
        delete el.dataset.ghostHidden;
        delete el.dataset.ghostPrevOpacity;
      }

      if (el.dataset.flipRunId && el.dataset.flipRunId !== runIdStr) {
        // Stale run marker; clear only transient bits.
        el.style.transition = "";
        el.style.transform = "";
        el.style.willChange = "";
        if (el.dataset.flipPrevZ != null) {
          el.style.zIndex = el.dataset.flipPrevZ || "";
          delete el.dataset.flipPrevZ;
        }
        delete el.dataset.flipRunId;
      }
    }

    // Measure new rects.
    const nextRects = new Map<string, DOMRect>();
    for (const el of cardEls) {
      const id = el.getAttribute("data-card-id");
      if (!id) continue;
      nextRects.set(id, el.getBoundingClientRect());
    }

    const prevRectsForRun = prevRects;

    const rectEq = (a: DOMRect, b: DOMRect) =>
      a.left === b.left &&
      a.top === b.top &&
      a.width === b.width &&
      a.height === b.height;

    const rectMapEq = (a: Map<string, DOMRect>, b: Map<string, DOMRect>) => {
      if (a.size !== b.size) return false;
      for (const [id, ra] of a) {
        const rb = b.get(id);
        if (!rb) return false;
        if (!rectEq(ra, rb)) return false;
      }
      return true;
    };

    const didRectsChange = !rectMapEq(prevRectsForRun, nextRects);

    // First paint (or reduced motion): just seed the map.
    if (prevRectsForRun.size === 0 || prefersReducedMotion) {
      if (didRectsChange) setPrevRects(nextRects);
      onFlipComplete?.(runId);
      return;
    }

    // If the last committed move came from pointer dragging, skip FLIP once.
    if (suppressFlipOnceRef.current) {
      suppressFlipOnceRef.current = false;
      if (didRectsChange) setPrevRects(nextRects);
      onFlipComplete?.(runId);
      return;
    }

    // If a pointer-drag overlay is active, don't try to FLIP (it will fight transforms).
    if (drag.active || drag.pending) {
      if (didRectsChange) setPrevRects(nextRects);
      onFlipComplete?.(runId);
      return;
    }

    // Ghost overlay helper for foundation/freecell landings
    const spawnGhost = (sourceEl: HTMLElement, from: DOMRect, to: DOMRect) => {
      const cardId = sourceEl.getAttribute("data-card-id") || "";

      // Snapshot opacity only on the first overlapping hide for this card.
      let entry = cardId ? ghostHideRef.current.get(cardId) : null;
      if (cardId) {
        if (entry) {
          entry.count += 1;
        } else {
          entry = { count: 1, prevOpacity: sourceEl.style.opacity };
          ghostHideRef.current.set(cardId, entry);
        }
      } else {
        // Fallback if somehow missing a card id.
        entry = { count: 1, prevOpacity: sourceEl.style.opacity };
      }

      // Clone BEFORE hiding so the ghost remains visible.
      const ghost = sourceEl.cloneNode(true) as HTMLElement;

      // Hide the real destination card only for the first overlapping flight.
      const shouldHideReal = cardId
        ? ghostHideRef.current.get(cardId)?.count === 1
        : true;
      if (shouldHideReal) {
        // Mark hidden state so a later FLIP run can restore if this flight is interrupted.
        sourceEl.dataset.ghostHidden = "1";
        sourceEl.dataset.ghostPrevOpacity = entry?.prevOpacity ?? "";
        sourceEl.style.opacity = "0";
      }
      // Ensure the clone stays visible even if the real is hidden.
      ghost.style.opacity = entry?.prevOpacity ?? "";

      // Ensure the clone doesn't keep any transforms/transitions from the real node.
      ghost.style.transition = "none";
      ghost.style.transform = "translate3d(0, 0, 0)";

      ghost.style.position = "fixed";
      ghost.style.left = `${from.left}px`;
      ghost.style.top = `${from.top}px`;
      ghost.style.width = `${from.width}px`;
      ghost.style.height = `${from.height}px`;
      ghost.style.margin = "0";
      ghost.style.pointerEvents = "none";
      ghost.style.zIndex = "1000";
      ghost.style.willChange = "transform";

      pendingAnimations += 1;
      document.body.appendChild(ghost);

      const dx = to.left - from.left;
      const dy = to.top - from.top;

      // Play on next frame.
      requestAnimationFrame(() => {
        ghost.style.transition = "transform 160ms ease";
        ghost.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      });

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;

        ghost.removeEventListener("transitionend", onEnd);
        ghost.remove();

        // Restore opacity only when the last overlapping flight completes.
        if (cardId) {
          const cur = ghostHideRef.current.get(cardId);
          if (cur) {
            cur.count -= 1;
            if (cur.count <= 0) {
              sourceEl.style.opacity = cur.prevOpacity;
              delete sourceEl.dataset.ghostHidden;
              delete sourceEl.dataset.ghostPrevOpacity;
              ghostHideRef.current.delete(cardId);
            }
          } else {
            sourceEl.style.opacity = entry?.prevOpacity ?? "";
            delete sourceEl.dataset.ghostHidden;
            delete sourceEl.dataset.ghostPrevOpacity;
          }
        } else {
          sourceEl.style.opacity = entry?.prevOpacity ?? "";
          delete sourceEl.dataset.ghostHidden;
          delete sourceEl.dataset.ghostPrevOpacity;
        }
        pendingAnimations -= 1;
        maybeComplete();
      };

      const onEnd = () => finish();
      ghost.addEventListener("transitionend", onEnd);
      // Fallback if transitionend doesn't fire.
      window.setTimeout(finish, 220);
    };

    // Invert: move elements back to where they used to be.
    for (const el of cardEls) {
      const id = el.getAttribute("data-card-id");
      if (!id) continue;
      const prev = prevRectsForRun.get(id);
      const next = nextRects.get(id);
      if (!prev || !next) continue;

      const dx = prev.left - next.left;
      const dy = prev.top - next.top;
      if (dx === 0 && dy === 0) continue;

      // If the card landed in a foundation/freecell, animate a clone overlay instead of
      // translating the real DOM node (prevents the destination slot from appearing empty).
      const meta = getNodeMeta(el);
      if (meta?.region === "foundation" || meta?.region === "freecell") {
        spawnGhost(el, prev, next);
        continue;
      }

      pendingAnimations += 1;
      // Set the inverted transform with no transition.
      el.style.transition = "none";
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      el.style.willChange = "transform";

      // Bring animating cards above others during FLIP.
      if (!el.dataset.flipPrevZ) {
        el.dataset.flipPrevZ = el.style.zIndex || "";
      }
      el.style.zIndex = "999";
      el.dataset.flipRunId = runIdStr;
    }

    // Play: on the next frame, remove the transform so it transitions into place.
    const raf = requestAnimationFrame(() => {
      for (const el of cardEls) {
        if (!el.style.transform) continue;

        let done = false;
        let timeoutId: number | null = null;

        const finish = () => {
          if (done) return;
          done = true;

          // If a newer FLIP run has started on this element, don't clobber its styles.
          if (el.dataset.flipRunId !== runIdStr) {
            el.removeEventListener("transitionend", onEnd);
            if (timeoutId != null) window.clearTimeout(timeoutId);
            // This run no longer owns this element; treat it as complete for this run.
            pendingAnimations -= 1;
            maybeComplete();
            return;
          }

          el.style.transition = "";
          el.style.transform = "";
          el.style.willChange = "";

          // Restore original z-index after the FLIP completes.
          el.style.zIndex = el.dataset.flipPrevZ || "";
          delete el.dataset.flipPrevZ;
          delete el.dataset.flipRunId;

          pendingAnimations -= 1;
          maybeComplete();

          el.removeEventListener("transitionend", onEnd);
          if (timeoutId != null) window.clearTimeout(timeoutId);
        };

        const onEnd = () => finish();
        el.addEventListener("transitionend", onEnd);

        // Fallback if transitionend doesn't fire (interrupted by rapid undos).
        timeoutId = window.setTimeout(finish, 220);

        // Trigger the transition by removing the transform.
        el.style.transition = "transform 160ms ease";
        el.style.transform = "translate3d(0, 0, 0)";
      }
    });

    // Update the stored rects for the next move.
    if (didRectsChange) setPrevRects(nextRects);

    // If nothing animated this run, signal completion immediately.
    maybeComplete();

    return () => cancelAnimationFrame(raf);
  }, [
    state,
    seedReady,
    kbCarrying,
    drag.active,
    drag.pending,
    boardRef,
    getNodeMeta,
    suppressFlipOnceRef,
    prevRects,
    onFlipComplete
  ]);

  return {
    prevCardRectsRef: rectsRef
  };
}
