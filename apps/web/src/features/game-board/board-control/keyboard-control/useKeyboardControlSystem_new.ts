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
  if (!boardRef) {
    throw new Error("useKeyboardControlSystem requires a boardRef");
  }

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
      (el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-disabled")
    );

    kbFocusablesRef.current = els;
  };

  const onKCSKeydown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (isInputSuppressed || !boardRef.current) return;
    refreshKbFocusables();

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
        kbFocusablesRef,
        activeFocusIndex,
        setActiveFocusIndex
      );
      return;
    }
  };

  return {
    kbCarrying,
    setKbCarrying,
    isInputSuppressed,
    onKCSKeydown
  };
}
