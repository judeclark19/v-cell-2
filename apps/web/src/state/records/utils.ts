import type { PersistedGame } from "@/persistence/types";
import type { Move, Rules } from "@vcell/engine";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/state/reduxStore";
import { getAllCompletedGames } from "@/persistence/completedGamesStore";
import { setCompletedGames } from "./recordsSlice";

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

export function useCompletedGamesHydration() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    let cancelled = false;

    getAllCompletedGames()
      .then((games) => {
        if (cancelled) return;
        dispatch(setCompletedGames(games));
      })
      .catch((err) => {
        console.error("[records] failed to hydrate completed games", err);
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch]);
}
