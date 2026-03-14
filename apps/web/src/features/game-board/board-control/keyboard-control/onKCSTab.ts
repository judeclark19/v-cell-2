export const onKCSTab = (
  e: React.KeyboardEvent<HTMLDivElement>,
  setKbCarrying: React.Dispatch<React.SetStateAction<boolean>>,
  boardRef: React.RefObject<HTMLDivElement>
) => {
  console.log("Tab key pressed in onKCSTab");
  setKbCarrying(false);
  // TODO: visuals.clearKbCarryVisuals();

  // Forward Tab can use the browser's normal traversal.
  if (!e.shiftKey) return;

  // Shift+Tab: if something elsewhere is trapping focus back into the board,
  // manually focus the previous focusable element that is NOT inside the board.
  const boardEl = boardRef.current;
  const activeEl = document.activeElement as HTMLElement | null;
  if (!boardEl || !activeEl) return;

  const focusables = Array.from(
    document.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => {
    // Skip elements not actually tabbable/visible.
    if (el.tabIndex < 0) return false;
    const ariaDisabled = el.getAttribute("aria-disabled");
    if (ariaDisabled === "true") return false;
    // Basic visibility check: offsetParent is null for display:none; fixed elements still have an offsetParent.
    // Also allow SVG/edge cases by checking bounding rect.
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    return true;
  });

  const idx = focusables.indexOf(activeEl);
  if (idx <= 0) return;

  for (let i = idx - 1; i >= 0; i--) {
    const candidate = focusables[i];
    if (boardEl.contains(candidate)) continue;

    e.preventDefault();
    candidate.focus();
    return;
  }

  return;
};
