// new-state
import type { KeyboardEvent } from "react";
import { selectIsAutoCompleting } from "@/state/game/gameSlice";
import { selectIsAnyModalOpen } from "@/state/ui/uiSlice";
import { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { onKCSTab } from "./onKCSTab";
import { moveKbFocus } from "./moveKbFocus";

export function useKeyboardControlSystem(
  boardRef: React.RefObject<HTMLDivElement | null>
) {
  // ui slice
  const isAnyModalOpen = useSelector(selectIsAnyModalOpen);
  const isAutoCompleting = useSelector(selectIsAutoCompleting);

  // keyboard control system state
  const [kbCarrying, setKbCarrying] = useState(false);
  const [activeFocusIndex, setActiveFocusIndex] = useState(0);
  const kbFocusablesRef = useRef<HTMLElement[]>([]);
  const isInputSuppressed = isAnyModalOpen || isAutoCompleting;

  const refreshKbFocusables = () => {
    const root = boardRef.current;
    if (!root) return;

    const selector = '[data-kb-focusable="true"]';

    const els = Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
      (el) =>
        !el.hasAttribute("disabled") &&
        el.getAttribute("aria-disabled") !== "true"
    );

    kbFocusablesRef.current = els;
  };

  const refreshAndGetFocusables = () => {
    refreshKbFocusables();
    return kbFocusablesRef.current;
  };

  const focusIndex = (index: number, els: HTMLElement[]) => {
    const clamped = Math.max(0, Math.min(index, els.length - 1));
    const el = els[clamped];
    if (!el) return false;

    setActiveFocusIndex(clamped);
    requestAnimationFrame(() => el.focus());
    return true;
  };

  const focusFirstPlayable = () => {
    const els = refreshAndGetFocusables();
    if (els.length === 0) return false;
    return focusIndex(0, els);
  };

  const focusElIfFocusable = (el: HTMLElement | null) => {
    const els = refreshAndGetFocusables();
    if (!el) return false;

    const idx = els.indexOf(el);
    if (idx < 0) return false;

    return focusIndex(idx, els);
  };

  const onKCSKeydown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (isInputSuppressed || !boardRef.current) return;
    const els = refreshAndGetFocusables();
    if (els.length === 0) return;

    if (e.key === "Tab") {
      onKCSTab(e, setKbCarrying, boardRef);
      return;
    }

    const directionMap: Record<string, "left" | "right" | "up" | "down"> = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down"
    };

    if (directionMap[e.key]) {
      moveKbFocus(
        e,
        directionMap[e.key],
        els,
        activeFocusIndex,
        setActiveFocusIndex
      );
      return;
    }
  };

  const onKCSPointerDown = (e: React.PointerEvent) => {
    if (isInputSuppressed) return;

    const target = e.target as HTMLElement | null;
    if (!target) {
      focusFirstPlayable();
      return;
    }

    const candidate =
      (target.closest(
        "[tabindex], .card, .freecell, .foundation, .tableau-col, .tableau-empty"
      ) as HTMLElement | null) || target;

    const focused = focusElIfFocusable(candidate);
    if (!focused) return;
  };

  return {
    kbCarrying,
    setKbCarrying,
    isInputSuppressed,
    onKCSKeydown,
    onKCSPointerDown
  };
}
