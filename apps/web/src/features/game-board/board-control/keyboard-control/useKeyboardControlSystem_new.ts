// new-state
import type { KeyboardEvent } from "react";
import { selectIsAutoCompleting } from "@/state/game/gameSlice";
import { selectIsAnyModalOpen } from "@/state/ui/uiSlice";
import { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { onKCSTab } from "./onKCSTab";
import { moveKbFocus } from "./moveKbFocus";
import { focusFirstPlayable, focusElIfFocusable } from "./focusUtils";
import { getKbFocusables } from "./getKbFocusables";

export function useKeyboardControlSystem(
  boardRef: React.RefObject<HTMLDivElement | null>
) {
  // ui slice
  const isAnyModalOpen = useSelector(selectIsAnyModalOpen);
  const isAutoCompleting = useSelector(selectIsAutoCompleting);

  // keyboard control system state
  const [kbCarrying, setKbCarrying] = useState(false);
  const [activeFocusIndex, setActiveFocusIndex] = useState(0);
  const isInputSuppressed = isAnyModalOpen || isAutoCompleting;

  // ----- Event handlers -----
  const onKCSKeydown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (isInputSuppressed || !boardRef.current) return;
    const els = getKbFocusables(boardRef.current);
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
      // focusFirstPlayable(refreshAndGetFocusables, setActiveFocusIndex);
      focusFirstPlayable(
        () => getKbFocusables(boardRef.current),
        setActiveFocusIndex
      );
      return;
    }

    const candidate =
      (target.closest(
        "[tabindex], .card, .freecell, .foundation, .tableau-col, .tableau-empty"
      ) as HTMLElement | null) || target;

    const focused = focusElIfFocusable(
      candidate,
      () => getKbFocusables(boardRef.current),
      setActiveFocusIndex
    );
    if (!focused) return;
  };

  const onKCSFocusCapture = (e: React.FocusEvent<HTMLDivElement>) => {
    const els = getKbFocusables(boardRef.current);
    if (els.length === 0) return;

    // Board container focused (empty click) => do nothing
    if (e.target === e.currentTarget) return;

    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Ignore focus outside our system
    const idx = els.indexOf(target);
    if (idx < 0) return;

    // Sync active index
    if (idx !== activeFocusIndex) {
      setActiveFocusIndex(idx);
    }
  };

  return {
    kbCarrying,
    setKbCarrying,
    isInputSuppressed,
    onKCSKeydown,
    onKCSPointerDown,
    onKCSFocusCapture
  };
}
