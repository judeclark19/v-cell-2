import { useCallback, useRef } from "react";

type UseDropTargetHoverArgs = {
  /**
   * When false, updateFromPoint becomes a no-op (useful when not dragging).
   * You should still call clear() on drag end to remove any lingering class.
   */
  enabled: boolean;
  /**
   * CSS selectors that represent meaningful drop zones.
   * We normalize elementFromPoint() to the nearest matching ancestor.
   *
   * Example: [".is-playable", ".card-slot"]
   */
  selectors: string[];
  /**
   * Class applied to the current hovered zone.
   * Example: "is-kb-drop-target"
   */
  className: string;
  /**
   * Optional callback fired only when the normalized zone changes.
   * Useful if a parent hook wants to store the element in state.
   */
  onChange?: (el: Element | null) => void;
};

/**
 * Tracks the "meaningful" element under a pointer and toggles a CSS class on it.
 *
 * Why this exists:
 * - document.elementFromPoint() returns many nested nodes while moving across the same zone.
 * - During pointer capture, :hover may not update. So we rely on a class instead.
 * - We only want to update when the *zone* changes, not every pixel.
 */
export function useDropTargetHover({
  enabled,
  selectors,
  className,
  onChange
}: UseDropTargetHoverArgs) {
  const currentRef = useRef<Element | null>(null);

  const normalize = useCallback(
    (raw: Element | null): Element | null => {
      if (!raw) return null;
      for (const sel of selectors) {
        const match = raw.closest(sel);
        if (match) return match;
      }
      return null;
    },
    [selectors]
  );

  const setCurrent = useCallback(
    (next: Element | null) => {
      const prev = currentRef.current;
      if (prev === next) return;

      if (prev) prev.classList.remove(className);
      if (next) next.classList.add(className);

      currentRef.current = next;
      onChange?.(next);
    },
    [className, onChange]
  );

  const updateFromPoint = useCallback(
    (clientX: number, clientY: number) => {
      if (!enabled) return;

      const raw = document.elementFromPoint(clientX, clientY);
      const zone = normalize(raw);
      setCurrent(zone);
    },
    [enabled, normalize, setCurrent]
  );

  const clear = useCallback(() => {
    setCurrent(null);
  }, [setCurrent]);

  return {
    /** The current normalized hovered element (read-only ref value). */
    current: currentRef,
    /** Call on pointer move to update hovered zone from the pointer position. */
    updateFromPoint,
    /** Call on drag end / cleanup to ensure the class is removed. */
    clear
  };
}
