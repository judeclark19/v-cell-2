import type { PileRef, TableauIndex } from "./piles";

export type Move =
  | {
      kind: "tableauStack";
      from: { type: "tableau"; index: TableauIndex };
      startIndex: number; // 0 = top card; moves a contiguous sub-stack
      to: { type: "tableau"; index: TableauIndex };
    }
  | {
      kind: "single";
      from: PileRef;
      to: PileRef;
    };
