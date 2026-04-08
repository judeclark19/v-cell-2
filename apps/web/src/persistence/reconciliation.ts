import type { PersistedGame } from "./types";

export function isCompletedStatus(status: PersistedGame["status"]): boolean {
  return status === "won" || status === "abandoned";
}

export function shouldIgnoreCloudInProgress({
  cloudSessionId,
  localCompleted
}: {
  cloudSessionId: string;
  localCompleted: PersistedGame | null;
}): boolean {
  return (
    !!localCompleted &&
    localCompleted.sessionId === cloudSessionId &&
    isCompletedStatus(localCompleted.status)
  );
}
