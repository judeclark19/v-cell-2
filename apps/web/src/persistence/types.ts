// apps/web/src/persistence/types.ts
import { GameStatus } from "@/state/game/gameSlice";
import type { GameState, Move } from "@vcell/engine";

// Local cloud-sync lifecycle:
// - pending_upload: local changes still need upload/retry
// - uploaded: remote acceptance is strongly evidenced (for example, successful write or matching live hydration),
//   but we have not completed strict server confirmation yet
// - synced: explicit server confirmation succeeded
export type CloudSyncState = "pending_upload" | "uploaded" | "synced";

export type PersistedGame = {
  // identity
  sessionId: string;
  deviceId: string; // analytics / “one per device” key
  userId?: string; // if not playing as guest
  seed: string;
  rules: GameState["rules"];
  kind?: "freeplay" | "daily" | string;

  // canonical history (sync-friendly)
  moves: Move[];
  cursor: number;

  // status
  status: GameStatus;

  // timing + UI meta
  timeElapsedMs: number;
  startedAtMs: number | null;
  endedAtMs: number | null;
  paused: boolean;

  // analytics
  moveCount: number;
  undosUsed: number;

  // bookkeeping
  updatedAtMs: number;
  syncVersion?: number;
  syncState?: CloudSyncState;
  lastCloudAttemptAtMs?: number | null;
  lastCloudError?: string | null;

  // optional pointer
  lastCompletedsessionId?: string;
};
