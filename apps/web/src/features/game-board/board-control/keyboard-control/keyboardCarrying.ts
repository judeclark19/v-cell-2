import { KBCarryRefs, KBCarryState } from "./useKeyboardControlSystem";

const CARRYING_CLASS = "is-kb-carried";
const DROP_TARGET_CLASS = "is-drop-target";

const cardIdToAlias = (cardId: string | undefined): string => {
  if (!cardId) return "Unknown Card";
  const rankPart = cardId.slice(0, -1);
  const suitPart = cardId.slice(-1);

  const rankMap: Record<string, string> = {
    A: "Ace",
    J: "Jack",
    Q: "Queen",
    K: "King"
  };

  const suitMap: Record<string, string> = {
    S: "Spades",
    H: "Hearts",
    C: "Clubs",
    D: "Diamonds"
  };

  const rankName = rankMap[rankPart] || rankPart;
  const suitName = suitMap[suitPart] || suitPart;

  return `${rankName} of ${suitName}`;
};

export const stopKbCarrying = (
  root: HTMLElement | null,
  kbCarryRefs: React.RefObject<KBCarryRefs>,
  setKbState: React.Dispatch<React.SetStateAction<KBCarryState>>
) => {
  if (!root) return;

  root
    .querySelectorAll<HTMLElement>(`.${CARRYING_CLASS}, .${DROP_TARGET_CLASS}`)
    .forEach((el) => {
      el.classList.remove(CARRYING_CLASS);
      el.classList.remove(DROP_TARGET_CLASS);
    });

  kbCarryRefs.current.carriedEl = null;
  kbCarryRefs.current.dropTargetEl = null;
  setKbState((prev) => ({ ...prev, carrying: false, carryingLabel: null }));
};

export const startKbCarrying = (
  root: HTMLElement | null,
  el: HTMLElement | null,
  kbCarryRefs: React.RefObject<KBCarryRefs>,
  setKbState: React.Dispatch<React.SetStateAction<KBCarryState>>
) => {
  if (!root) return;

  // Clear old carried element
  if (kbCarryRefs.current.carriedEl && kbCarryRefs.current.carriedEl !== el) {
    kbCarryRefs.current.carriedEl.classList.remove(CARRYING_CLASS);
  }

  kbCarryRefs.current.carriedEl = el;
  if (kbCarryRefs.current.carriedEl) {
    kbCarryRefs.current.carriedEl.classList.add(CARRYING_CLASS);
  }

  setKbState((prev) => ({
    ...prev,
    carrying: true,
    carryingLabel: cardIdToAlias(el?.dataset.cardId)
  }));
};

export const setKeyboardDropTarget = (
  el: HTMLElement | null,
  kbCarryRefs: React.RefObject<KBCarryRefs>
) => {
  if (
    kbCarryRefs.current.dropTargetEl &&
    kbCarryRefs.current.dropTargetEl !== el
  ) {
    kbCarryRefs.current.dropTargetEl.classList.remove(DROP_TARGET_CLASS);
  }

  kbCarryRefs.current.dropTargetEl = el;

  if (kbCarryRefs.current.dropTargetEl) {
    kbCarryRefs.current.dropTargetEl.classList.add(DROP_TARGET_CLASS);
  }
};
