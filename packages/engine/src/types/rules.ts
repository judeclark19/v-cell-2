export type UndoLimit = 0 | 1 | 3 | 5 | "unlimited";
export type FaceDownCount = 0 | 7 | 14 | 21;

export type Rules = {
  faceDownCount: FaceDownCount;
  allowFoundationPullback: boolean;
  undoLimit: UndoLimit;
};
