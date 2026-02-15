// apps/web/src/persistence/types.ts
import type { GameState, Move } from "@vcell/engine";

export type GameStatus = "in_progress" | "won" | "abandoned";

export type PersistedGame = {
  // identity
  gameId: string;
  deviceId: string; // analytics / “one per device” key
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
  hasStarted: boolean;
  startedAtMs: number | null;
  endedAtMs: number | null;
  paused: boolean;

  // analytics
  moveCount: number;
  undosUsed: number;

  // bookkeeping
  updatedAtMs: number;

  // optional pointer
  lastCompletedGameId?: string;
};
