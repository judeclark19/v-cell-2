import { Rules } from "@vcell/engine";

export function areRulesEqual(a: Rules, b: Rules): boolean {
  return (
    a.allowFoundationPullback === b.allowFoundationPullback &&
    a.undoLimit === b.undoLimit &&
    a.faceDownCount === b.faceDownCount
  );
}
