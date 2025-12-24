export type TableauIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type FreeCellIndex = 0 | 1 | 2 | 3 | 4;
export type FoundationIndex = 0 | 1 | 2 | 3;

export type PileRef =
  | { type: "tableau"; index: TableauIndex }
  | { type: "freecell"; index: FreeCellIndex }
  | { type: "foundation"; index: FoundationIndex };
