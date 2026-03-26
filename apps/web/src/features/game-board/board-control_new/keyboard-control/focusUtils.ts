export const focusIndex = (
  index: number,
  els: HTMLElement[],
  setActiveFocusIndex: (i: number) => void
) => {
  const clamped = Math.max(0, Math.min(index, els.length - 1));
  const el = els[clamped];
  if (!el) return false;

  setActiveFocusIndex(clamped);
  requestAnimationFrame(() => el.focus());
  return true;
};

export const focusFirstPlayable = (
  getEls: () => HTMLElement[],
  setActiveFocusIndex: (i: number) => void
) => {
  const els = getEls();
  if (els.length === 0) return false;
  return focusIndex(0, els, setActiveFocusIndex);
};

export const focusElIfFocusable = (
  el: HTMLElement | null,
  getEls: () => HTMLElement[],
  setActiveFocusIndex: (i: number) => void
) => {
  const els = getEls();
  if (!el) return false;

  const idx = els.indexOf(el);
  if (idx < 0) return false;

  return focusIndex(idx, els, setActiveFocusIndex);
};
