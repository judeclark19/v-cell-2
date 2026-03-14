// new-state
import { useKeyboardControlSystem } from "./keyboard-control/useKeyboardControlSystem_new";

export function useBoardControlSystem(
  boardRef: React.RefObject<HTMLDivElement | null>
) {
  const keyboard = useKeyboardControlSystem(boardRef);

  return {
    ...keyboard
  };
}
