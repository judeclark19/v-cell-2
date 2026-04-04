import { KBCarryState } from "./useKeyboardControlSystem";

export const focusIndex = (
  index: number,
  els: HTMLElement[],
  setKbState: React.Dispatch<React.SetStateAction<KBCarryState>>
) => {
  const clamped = Math.max(0, Math.min(index, els.length - 1));
  const el = els[clamped];
  if (!el) return false;

  setKbState((prev) => ({ ...prev, activeFocusIndex: clamped }));
  requestAnimationFrame(() => el.focus());
  return true;
};

export const focusFirstPlayable = (
  getEls: () => HTMLElement[],
  setKbState: React.Dispatch<React.SetStateAction<KBCarryState>>
) => {
  const els = getEls();
  if (els.length === 0) return false;
  return focusIndex(0, els, setKbState);
};

export const focusElIfFocusable = (
  el: HTMLElement | null,
  getEls: () => HTMLElement[],
  setKbState: React.Dispatch<React.SetStateAction<KBCarryState>>
) => {
  const els = getEls();
  if (!el) return false;

  const idx = els.indexOf(el);
  if (idx < 0) return false;

  return focusIndex(idx, els, setKbState);
};
