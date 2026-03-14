// new-state
import type { KeyboardEvent } from "react";
import { selectIsAutoCompleting } from "@/state/game/gameSlice";
import { selectIsAnyModalOpen } from "@/state/ui/uiSlice";
import { useState } from "react";
import { useSelector } from "react-redux";
import { onKCSTab } from "./onKCSTab";

export function useKeyboardControlSystem(boardRef) {
  // ui slice
  const isAnyModalOpen = useSelector(selectIsAnyModalOpen);
  const isAutoCompleting = useSelector(selectIsAutoCompleting);

  // keyboard control system state
  const [kbCarrying, setKbCarrying] = useState(false);
  const isInputSuppressed = isAnyModalOpen || isAutoCompleting;

  const onKCSKeydown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (isInputSuppressed) return;

    switch (e.key) {
      case "Tab": {
        onKCSTab(e, setKbCarrying);
        break;
      }
      case "ArrowLeft": {
        console.log("onKCSKeydown: ArrowLeft pressed");
        break;
      }
      case "ArrowRight": {
        console.log("onKCSKeydown: ArrowRight pressed");
        break;
      }
      case "ArrowUp": {
        console.log("onKCSKeydown: ArrowUp pressed");
        break;
      }
      case "ArrowDown": {
        console.log("onKCSKeydown: ArrowDown pressed");
        break;
      }
      default:
        break;
    }
  };

  return {
    kbCarrying,
    setKbCarrying,
    isInputSuppressed,
    onKCSKeydown
  };
}
