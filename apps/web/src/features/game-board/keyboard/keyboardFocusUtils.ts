/**
 * Keyboard focus utilities for the game board.
 *
 * These helpers are intentionally DOM-only and stateless.
 * They should not depend on React state or hooks.
 */

/**
 * Attempt to find a focusable card element by card id.
 *
 * We support multiple selectors to stay resilient to markup changes:
 * - data-card-id
 * - data-card
 * - aria-label="Card <id>"
 */
export function findFocusableCardElById(
  root: HTMLElement,
  cardId: string
): HTMLElement | null {
  if (!root || !cardId) return null;

  // Most explicit / preferred
  let el = root.querySelector<HTMLElement>(`[data-card-id="${cardId}"]`);
  if (el) return el;

  // Older / alternate data attribute
  el = root.querySelector<HTMLElement>(`[data-card="${cardId}"]`);
  if (el) return el;

  // Accessibility fallback
  el = root.querySelector<HTMLElement>(`[aria-label="Card ${cardId}"]`);
  if (el) return el;

  return null;
}
