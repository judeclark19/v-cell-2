import type { PersistedGame } from "@/persistence/types";
import type { Move, Rules } from "@vcell/engine";

export type BuildCompletedGameRecordArgs = {
  // TODO: maybe merge w PersistedGame type
  sessionId: string;
  deviceId: string;
  seed: string;
  rules: Rules;
  finalStatus: "won" | "abandoned";
  cursor: number;
  moves: Move[];
  startedAtMs: number | null;
  endedAtMs: number;
  timeElapsedMs: number;
  undosUsed: number;
  uid: string | null;
};

export function buildCompletedGameRecord({
  sessionId,
  deviceId,
  seed,
  rules,
  finalStatus,
  cursor,
  moves,
  startedAtMs,
  endedAtMs,
  timeElapsedMs,
  undosUsed,
  uid
}: BuildCompletedGameRecordArgs): PersistedGame {
  return {
    sessionId,
    deviceId,
    seed,
    rules,
    kind: "freeplay",

    status: finalStatus,

    startedAtMs,
    endedAtMs,
    timeElapsedMs,
    paused: false,

    moveCount: cursor,
    undosUsed,
    moves,
    cursor,

    updatedAtMs: endedAtMs,
    ...(uid ? { userId: uid } : {})
  };
}
