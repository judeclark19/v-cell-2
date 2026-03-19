// new-state
import { useDispatch, useSelector } from "react-redux";
import { useKeyboardControlSystem } from "./keyboard-control/useKeyboardControlSystem_new";
import { usePointerControlSystem } from "./pointer-control/usePointerControlSystem_new";
import { selectLegalMoves } from "@/state/game/gameSlice/selectors";
import { selectUid } from "@/state/auth/authSlice";
import { applyMoveThunk } from "@/state/game/thunks/applyMove";
import { AppDispatch } from "@/state/reduxStore";

export type BoardSource =
  | { type: "foundation"; index: number }
  | { type: "tableau"; index: number; startIndex: number }
  | { type: "freecell"; index: number };

export function useBoardControlSystem(
  boardRef: React.RefObject<HTMLDivElement | null>
) {
  const dispatch = useDispatch<AppDispatch>();
  const uid = useSelector(selectUid);
  const legalMoves = useSelector(selectLegalMoves);

  const keyboard = useKeyboardControlSystem(boardRef);
  const pointer = usePointerControlSystem();

  const resolveBoardSourceFromEl = (el: HTMLElement): BoardSource | null => {
    const region = el.dataset.region;
    const indexRaw = el.dataset.regionIndex;

    if (!region || indexRaw == null) return null;

    const index = Number(indexRaw);
    if (Number.isNaN(index)) return null;

    if (region === "tableau") {
      const startIndexRaw = el.dataset.positionInStack;
      if (startIndexRaw == null) return null;

      const startIndex = Number(startIndexRaw);
      if (Number.isNaN(startIndex)) return null;

      return { type: "tableau", index, startIndex };
    }

    if (region === "freecell") {
      return { type: "freecell", index };
    }

    if (region === "foundation") {
      return { type: "foundation", index };
    }

    return null;
  };

  const tryAutoFoundation = (el: HTMLElement) => {
    // 1. Resolve the board source from the element.
    const from = resolveBoardSourceFromEl(el);
    if (!from) return false;

    // 2. Find the matching legal single-card move to a foundation.
    const match = legalMoves.find(
      (m) =>
        m.kind === "single" &&
        m.from.type === from.type &&
        m.from.index === from.index &&
        m.to.type === "foundation"
    );

    if (!match) return false;

    // 3. If flight data is available, start kb flight.
    const cardId = el.dataset.cardId;
    const toIndex = match.to.index;

    if (cardId) {
      keyboard.startKbFlight({
        cardIds: [cardId],
        dropTarget: { type: "foundation", index: toIndex }
      });
    }

    // 4. Commit the move.
    dispatch(applyMoveThunk({ move: match, uid }));

    // 5. Return whether a move was made.
    return true;
  };

  return {
    ...keyboard,
    ...pointer,
    tryAutoFoundation
  };
}
