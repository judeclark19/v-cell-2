// new-state
import { useKeyboardControlSystem } from "./keyboard-control/useKeyboardControlSystem_new";
import { usePointerControlSystem } from "./pointer-control/usePointerControlSystem_new";

export function useBoardControlSystem(
  boardRef: React.RefObject<HTMLDivElement | null>
) {
  const keyboard = useKeyboardControlSystem(boardRef);
  const pointer = usePointerControlSystem();
  return {
    ...keyboard,
    ...pointer
  };
}
