export const getKbFocusables = (root: HTMLElement | null) => {
  if (!root) return [];

  return Array.from(
    root.querySelectorAll<HTMLElement>('[data-kb-focusable="true"]')
  ).filter(
    (el) =>
      !el.hasAttribute("disabled") &&
      el.getAttribute("aria-disabled") !== "true"
  );
};
