import { selectIsAutoCompleting } from "@/state/game/gameSlice";
import { selectIsAnyModalOpen } from "@/state/ui/uiSlice";
import { useSelector } from "react-redux";

export function usePointerControlSystem() {
  // ui slice
  // const isAnyModalOpen = useSelector(selectIsAnyModalOpen);
  // const isAutoCompleting = useSelector(selectIsAutoCompleting);

  // // local state
  // const isInputSuppressed = isAnyModalOpen || isAutoCompleting;

  // const onBoardPointerDown = (e: React.PointerEvent) => {};
  return {
    // onBoardPointerDown
  };
}
