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
  prevCardRectsRef
}: UseBoardFlipAnimationArgs) {
  const internalPrevRectsRef = React.useRef<Map<string, DOMRect>>(new Map());
  const rectsRef = prevCardRectsRef ?? internalPrevRectsRef;

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

    const cardEls = Array.from(
      root.querySelectorAll<HTMLElement>(".card[data-card-id]")
    );

    // Measure new rects.
    const nextRects = new Map<string, DOMRect>();
    for (const el of cardEls) {
      const id = el.getAttribute("data-card-id");
      if (!id) continue;
      nextRects.set(id, el.getBoundingClientRect());
    }

    const prevRects = rectsRef.current;

    // First paint (or reduced motion): just seed the map.
    if (prevRects.size === 0 || prefersReducedMotion) {
      rectsRef.current = nextRects;
      return;
    }

    // If the last committed move came from pointer dragging, skip FLIP once.
    if (suppressFlipOnceRef.current) {
      suppressFlipOnceRef.current = false;
      rectsRef.current = nextRects;
      return;
    }

    // If a pointer-drag overlay is active, don't try to FLIP (it will fight transforms).
    if (drag.active || drag.pending) {
      rectsRef.current = nextRects;
      return;
    }

    // Ghost overlay helper for foundation/freecell landings
    const spawnGhost = (sourceEl: HTMLElement, from: DOMRect, to: DOMRect) => {
      const ghost = sourceEl.cloneNode(true) as HTMLElement;

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

      document.body.appendChild(ghost);

      const dx = to.left - from.left;
      const dy = to.top - from.top;

      // Play on next frame.
      requestAnimationFrame(() => {
        ghost.style.transition = "transform 160ms ease";
        ghost.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      });

      const onEnd = () => {
        ghost.removeEventListener("transitionend", onEnd);
        ghost.remove();
      };

      ghost.addEventListener("transitionend", onEnd);
    };

    // Invert: move elements back to where they used to be.
    for (const el of cardEls) {
      const id = el.getAttribute("data-card-id");
      if (!id) continue;
      const prev = prevRects.get(id);
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

      // Set the inverted transform with no transition.
      el.style.transition = "none";
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      el.style.willChange = "transform";

      // Bring animating cards above others during FLIP.
      if (!el.dataset.flipPrevZ) {
        el.dataset.flipPrevZ = el.style.zIndex || "";
      }
      el.style.zIndex = "999";
    }

    // Play: on the next frame, remove the transform so it transitions into place.
    const raf = requestAnimationFrame(() => {
      for (const el of cardEls) {
        if (!el.style.transform) continue;

        // If the element is already being styled by another transition, we still want our
        // transform transition to win.
        el.style.transition = "transform 160ms ease";
        el.style.transform = "translate3d(0, 0, 0)";

        const onEnd = () => {
          el.style.transition = "";
          el.style.transform = "";
          el.style.willChange = "";

          // Restore original z-index after the FLIP completes.
          el.style.zIndex = el.dataset.flipPrevZ || "";
          delete el.dataset.flipPrevZ;

          el.removeEventListener("transitionend", onEnd);
        };

        el.addEventListener("transitionend", onEnd);
      }
    });

    // Update the stored rects for the next move.
    rectsRef.current = nextRects;

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
    rectsRef
  ]);

  return {
    prevCardRectsRef: rectsRef
  };
}
