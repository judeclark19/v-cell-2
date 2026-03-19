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
