const CARRYING_CLASS = "is-kb-carried";
const DROP_TARGET_CLASS = "is-drop-target";

export const stopKbCarrying = (
  root: HTMLElement | null,
  kbCarriedElRef: React.RefObject<HTMLElement | null>,
  kbDropTargetElRef: React.RefObject<HTMLElement | null>,
  setKbCarrying: React.Dispatch<React.SetStateAction<boolean>>
) => {
  if (!root) return;

  root
    .querySelectorAll<HTMLElement>(`.${CARRYING_CLASS}, .${DROP_TARGET_CLASS}`)
    .forEach((el) => {
      el.classList.remove(CARRYING_CLASS);
      el.classList.remove(DROP_TARGET_CLASS);
    });

  kbCarriedElRef.current = null;

  kbDropTargetElRef.current = null;
  setKbCarrying(false);
};

export const startKbCarrying = (
  root: HTMLElement | null,
  el: HTMLElement | null,
  kbCarriedElRef: React.RefObject<HTMLElement | null>,
  setKbCarrying: React.Dispatch<React.SetStateAction<boolean>>
) => {
  if (!root) return;

  // Clear old carried element
  if (kbCarriedElRef.current && kbCarriedElRef.current !== el) {
    kbCarriedElRef.current.classList.remove(CARRYING_CLASS);
  }

  kbCarriedElRef.current = el;
  if (kbCarriedElRef.current) {
    kbCarriedElRef.current.classList.add(CARRYING_CLASS);
  }

  setKbCarrying(true);
};

export const setKeyboardDropTarget = (
  el: HTMLElement | null,
  dropTargetElRef: React.RefObject<HTMLElement | null>
) => {
  if (dropTargetElRef.current && dropTargetElRef.current !== el) {
    dropTargetElRef.current.classList.remove(DROP_TARGET_CLASS);
  }

  dropTargetElRef.current = el;

  if (dropTargetElRef.current) {
    dropTargetElRef.current.classList.add(DROP_TARGET_CLASS);
  }
};
