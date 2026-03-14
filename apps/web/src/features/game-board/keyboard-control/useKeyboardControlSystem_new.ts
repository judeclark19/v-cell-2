// new-state

import { selectIsAutoCompleting } from "@/state/game/gameSlice";
import { selectIsAnyModalOpen } from "@/state/ui/uiSlice";
import { useState } from "react";
import { useSelector } from "react-redux";

export function useKeyboardControlSystem() {
  const isAnyModalOpen = useSelector(selectIsAnyModalOpen);
  const isAutoCompleting = useSelector(selectIsAutoCompleting);

  const [kbCarrying, setKbCarrying] = useState(false);
  const isInputSuppressed = isAnyModalOpen || isAutoCompleting;

  return {
    kbCarrying,
    setKbCarrying,
    isInputSuppressed
  };
}
