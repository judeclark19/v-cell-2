import { PileRef } from "@vcell/engine";
import { KBCarryState } from "./useKeyboardControlSystem";

export type BoardNodeMeta = {
  region: "tableau" | "freecell" | "foundation";
  regionIndex: number; // which tableau col
  positionInStack: number | undefined; // -1 represents the empty slot / column container
};

const getCenter = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

const getNodeMeta = (el: HTMLElement): BoardNodeMeta | null => {
  const region = el.dataset.region;

  if (
    region !== "tableau" &&
    region !== "foundation" &&
    region !== "freecell"
  ) {
    return null;
  }

  return {
    region,
    regionIndex: Number(el.dataset.regionIndex),
    positionInStack: el.dataset.positionInStack
      ? Number(el.dataset.positionInStack)
      : undefined
  };
};

const getFreeCellCardCandidates = (boardEl: HTMLDivElement) =>
  Array.from(
    boardEl.querySelectorAll<HTMLElement>(
      `[data-region="freecell"][data-card-id]`
    )
  );

export const focusOnPileRef = (boardEl: HTMLDivElement, ref: PileRef) => {
  const candidates = Array.from(
    boardEl.querySelectorAll<HTMLElement>(
      `[data-region="${ref.type}"][data-region-index="${ref.index}"].card-slot, ` +
        `[data-region="${ref.type}"][data-region-index="${ref.index}"].is-playable`
    )
  );

  if (!candidates || candidates.length === 0) return;

  // focus on the last candidate (the top card in the pile)
  requestAnimationFrame(() => {
    candidates[candidates.length - 1].focus();
  });
};

export const moveKbFocus = (
  boardRef: React.RefObject<HTMLDivElement | null>,
  e: KeyboardEvent,
  direction: "left" | "right" | "up" | "down",
  kbFocusableEls: HTMLElement[],
  kbState: KBCarryState,
  setKbState: React.Dispatch<React.SetStateAction<KBCarryState>>
) => {
  e.preventDefault();

  if (!kbFocusableEls || kbFocusableEls.length === 0) return;

  //   Helper functions
  const getActiveFocusableEl = () => {
    const activeEl = document.activeElement as HTMLElement | null;
    if (activeEl && getNodeMeta(activeEl)) return activeEl;
    return (
      kbFocusableEls[
        Math.max(
          0,
          Math.min(kbState.activeFocusIndex, kbFocusableEls.length - 1)
        )
      ] ?? null
    );
  };

  const focusOn = (index: number) => {
    setKbState((prev) => ({ ...prev, activeFocusIndex: index }));
    const nextEl =
      kbFocusableEls[Math.max(0, Math.min(index, kbFocusableEls.length - 1))];
    if (!nextEl) return;
    requestAnimationFrame(() => {
      nextEl.focus();
    });
  };

  // ----- Resolve current focus -----

  // FROM: el, center, meta
  const from = {
    el: null as HTMLElement | null,
    center: null as { x: number; y: number } | null,
    meta: null as BoardNodeMeta | null
  };
  from.el = getActiveFocusableEl();
  if (!from.el) return;
  from.center = getCenter(from.el);
  from.meta = getNodeMeta(from.el);

  let bestIdx = -1;
  let bestScore = Number.POSITIVE_INFINITY;

  // ----- Vertical (down) logic -----
  // Special case: when pressing DOWN from the bottom of a tableau column,
  // prefer entering the free-cells row rather than jumping to a longer neighboring column.
  if (direction === "down" && from.meta?.region === "tableau") {
    if (
      typeof from.meta.regionIndex === "number" &&
      typeof from.meta.positionInStack === "number"
    ) {
      // If we're on the empty slot/container (-1), treat it as the bottom of the column.
      const effectiveFromRow =
        from.meta.positionInStack === -1
          ? Number.POSITIVE_INFINITY
          : from.meta.positionInStack;

      // 1) First, try to move down within the same tableau column.
      let bestSameColIdx = -1;
      let bestSameColRow = Number.POSITIVE_INFINITY;

      for (let i = 0; i < kbFocusableEls.length; i++) {
        const el = kbFocusableEls[i];
        if (el === from.el) continue;

        const to = {
          el,
          center: getCenter(el),
          meta: getNodeMeta(el)
        };

        if (!to.meta) continue;

        if (to.meta.regionIndex !== from.meta.regionIndex) continue;
        if (
          to.meta.positionInStack !== undefined &&
          to.meta.positionInStack <= effectiveFromRow
        )
          continue;

        if (
          to.meta.positionInStack !== undefined &&
          to.meta.positionInStack < bestSameColRow
        ) {
          bestSameColRow = to.meta.positionInStack;
          bestSameColIdx = i;
        }
      }

      if (bestSameColIdx >= 0) {
        focusOn(bestSameColIdx);
        return;
      }

      // 2) No lower focusable in this column. Jump to the nearest free cell by x-alignment.
      let bestFreeCellIdx = -1;
      let bestDx = Number.POSITIVE_INFINITY;

      for (let i = 0; i < kbFocusableEls.length; i++) {
        const el = kbFocusableEls[i];
        const to = {
          el: kbFocusableEls[i],
          center: getCenter(el),
          meta: getNodeMeta(el)
        };

        if (!to.meta || to.meta.region !== "freecell") continue;

        const dx = Math.abs(to.center.x - from.center.x);

        if (dx < bestDx) {
          bestDx = dx;
          bestFreeCellIdx = i;
        }
      }

      if (bestFreeCellIdx >= 0) {
        focusOn(bestFreeCellIdx);
        return;
      }
    }
  }
  if (!from.meta) return;

  // ----- Horizontal freecell logic -----
  if (
    (direction === "left" || direction === "right") &&
    from.meta.region === "freecell"
  ) {
    const freeCellCards = getFreeCellCardCandidates(boardRef.current!);
    let bestSameRegionIdx = -1;
    let bestRegionDelta = Number.POSITIVE_INFINITY;
    let bestDx = Number.POSITIVE_INFINITY;

    for (const el of freeCellCards) {
      if (el === from.el) continue;

      const to = {
        el,
        center: getCenter(el),
        meta: getNodeMeta(el)
      };

      if (!to.meta) continue;

      if (
        direction === "right" &&
        to.meta.regionIndex <= from.meta.regionIndex
      ) {
        continue;
      }

      if (
        direction === "left" &&
        to.meta.regionIndex >= from.meta.regionIndex
      ) {
        continue;
      }

      const regionDelta = Math.abs(to.meta.regionIndex - from.meta.regionIndex);
      const dx = Math.abs(to.center.x - from.center.x);

      if (
        regionDelta < bestRegionDelta ||
        (regionDelta === bestRegionDelta && dx < bestDx)
      ) {
        bestRegionDelta = regionDelta;
        bestDx = dx;
        bestSameRegionIdx = kbFocusableEls.indexOf(el);
      }
    }

    if (bestSameRegionIdx >= 0) {
      focusOn(bestSameRegionIdx);
      return;
    }

    return;
  }

  // ----- Horizontal foundation logic -----
  if (
    (direction === "left" || direction === "right") &&
    from.meta.region === "foundation"
  ) {
    let bestSameRegionIdx = -1;
    let bestRegionDelta = Number.POSITIVE_INFINITY;
    let bestDx = Number.POSITIVE_INFINITY;

    for (let i = 0; i < kbFocusableEls.length; i++) {
      const el = kbFocusableEls[i];
      if (el === from.el) continue;

      const to = {
        el,
        center: getCenter(el),
        meta: getNodeMeta(el)
      };

      if (!to.meta || to.meta.region !== from.meta.region) continue;

      if (
        direction === "right" &&
        to.meta.regionIndex <= from.meta.regionIndex
      ) {
        continue;
      }

      if (
        direction === "left" &&
        to.meta.regionIndex >= from.meta.regionIndex
      ) {
        continue;
      }

      const regionDelta = Math.abs(to.meta.regionIndex - from.meta.regionIndex);
      const dx = Math.abs(to.center.x - from.center.x);

      if (
        regionDelta < bestRegionDelta ||
        (regionDelta === bestRegionDelta && dx < bestDx)
      ) {
        bestRegionDelta = regionDelta;
        bestDx = dx;
        bestSameRegionIdx = i;
      }
    }

    if (bestSameRegionIdx >= 0) {
      focusOn(bestSameRegionIdx);
      return;
    }
  }

  // ----- Horizontal tableau logic -----
  if (
    (direction === "left" || direction === "right") &&
    from.meta.region === "tableau"
  ) {
    if (
      typeof from.meta.regionIndex === "number" &&
      typeof from.meta.positionInStack === "number"
    ) {
      // If focused on an empty slot/container (-1), treat it as the bottom of the column.
      const effectiveFromRow =
        from.meta.positionInStack === -1
          ? Number.POSITIVE_INFINITY
          : from.meta.positionInStack;

      let bestIdx = -1;
      let bestColDelta = Number.POSITIVE_INFINITY;
      let bestRowDelta = Number.POSITIVE_INFINITY;

      for (let i = 0; i < kbFocusableEls.length; i++) {
        const el = kbFocusableEls[i];
        if (el === from.el) continue;

        const to = {
          el,
          center: getCenter(el),
          meta: getNodeMeta(el)
        };

        if (!to.meta || to.meta.region !== "tableau") continue;

        if (
          typeof to.meta.regionIndex !== "number" ||
          typeof to.meta.positionInStack !== "number"
        )
          continue;
        if (to.meta.regionIndex === from.meta.regionIndex) continue; // L/R must change columns

        // Enforce direction by column index (not by pixel geometry).
        if (
          direction === "right" &&
          to.meta.regionIndex <= from.meta.regionIndex
        )
          continue;
        if (
          direction === "left" &&
          to.meta.regionIndex >= from.meta.regionIndex
        )
          continue;

        const colDelta = Math.abs(to.meta.regionIndex - from.meta.regionIndex);
        const effectiveToRow =
          to.meta.positionInStack === -1
            ? Number.POSITIVE_INFINITY
            : to.meta.positionInStack;
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
        focusOn(bestIdx);
        return;
      }
    }
  }

  // ----- Fallback spatial navigation -----
  // Default movement by proximity -
  // check all kbFocusableEls for most proximate
  for (let i = 0; i < kbFocusableEls.length; i++) {
    const el = kbFocusableEls[i];
    if (el === from.el) continue;

    const to = {
      el,
      center: getCenter(el),
      meta: getNodeMeta(el)
    };

    const dx = to.center.x - from.center.x;
    const dy = to.center.y - from.center.y;

    const isInDir =
      (direction === "left" && dx < -1) ||
      (direction === "right" && dx > 1) ||
      (direction === "up" && dy < -1) ||
      (direction === "down" && dy > 1);

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
    focusOn(bestIdx);
    return;
  }
};
