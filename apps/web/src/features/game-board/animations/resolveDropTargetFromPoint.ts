export type DropTarget =
  | { type: "tableau"; colIndex: number }
  | { type: "freecell"; index: number }
  | { type: "foundation"; index: number }
  | null;

type ResolveDropTargetArgs = {
  clientX: number;
  clientY: number;
  /** Returns the column root elements (or null if not mounted). */
  getTableauCols?: () => Array<HTMLElement | null>;
  /** Returns the free cell slot elements (or null if not mounted). */
  getFreeCells?: () => Array<HTMLElement | null>;
  /** Returns the foundation slot elements (or null if not mounted). */
  getFoundations?: () => Array<HTMLElement | null>;
};

/**
 * Pure(ish) hit-test utility: given a point, determine which pile the point is over.
 * This intentionally does NOT use React state; it relies only on DOM geometry.
 *
 * Priority order:
 * 1) Foundations
 * 2) Free cells
 * 3) Tableau columns
 *
 * If no pile contains the point, returns null.
 */
export function resolveDropTargetFromPoint({
  clientX,
  clientY,
  getTableauCols,
  getFreeCells,
  getFoundations
}: ResolveDropTargetArgs): DropTarget {
  const within = (el: HTMLElement, x: number, y: number) => {
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  const foundations = getFoundations?.() ?? [];
  for (let i = 0; i < foundations.length; i++) {
    const el = foundations[i];
    if (!el) continue;
    if (within(el, clientX, clientY)) return { type: "foundation", index: i };
  }

  const freeCells = getFreeCells?.() ?? [];
  for (let i = 0; i < freeCells.length; i++) {
    const el = freeCells[i];
    if (!el) continue;
    if (within(el, clientX, clientY)) return { type: "freecell", index: i };
  }

  const cols = getTableauCols?.() ?? [];
  for (let i = 0; i < cols.length; i++) {
    const el = cols[i];
    if (!el) continue;
    if (within(el, clientX, clientY)) return { type: "tableau", colIndex: i };
  }

  return null;
}
