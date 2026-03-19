export const clearKbCarryVisuals = (root: HTMLElement | null) => {
  if (!root) return;

  const CARRYING_CLASS = "is-kb-carried";
  const DROP_TARGET_CLASS = "is-drop-target";

  root
    .querySelectorAll<HTMLElement>(`.${CARRYING_CLASS}, .${DROP_TARGET_CLASS}`)
    .forEach((el) => {
      el.classList.remove(CARRYING_CLASS);
      el.classList.remove(DROP_TARGET_CLASS);
    });
};

export const setKeyboardDropTarget = (
  el: HTMLElement | null,
  dropTargetElRef: React.RefObject<HTMLElement | null>
) => {
  const DROP_TARGET_CLASS = "is-drop-target";

  if (dropTargetElRef.current && dropTargetElRef.current !== el) {
    dropTargetElRef.current.classList.remove(DROP_TARGET_CLASS);
  }

  dropTargetElRef.current = el;

  if (dropTargetElRef.current) {
    dropTargetElRef.current.classList.add(DROP_TARGET_CLASS);
  }
};
