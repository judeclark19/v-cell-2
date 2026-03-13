import { useState } from "react";

export function useKeyboardState() {
  const [kbCarrying, setKbCarrying] = useState(false);

  return {
    kbCarrying,
    setKbCarrying
  };
}
