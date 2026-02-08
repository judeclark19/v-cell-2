"use client";

import { useEffect, useRef } from "react";
import type { GameState, Rules } from "@vcell/engine";
import type { HistoryState } from "../GameProvider";
import {
  getInProgressGame,
  upsertInProgressGame,
  deleteInProgressGame
} from "../../../persistence/inProgressGamesStore";

type Params = {
  // identity
  seedReady: boolean;
  gameId: string;
  seed: string;
  rules: Rules;

  // snapshot + meta
  history: HistoryState;
  timeElapsedMsRef: React.RefObject<number>;
  hasStarted: boolean;
  startedAtMs: number | null;
  endedAtMs: number | null;
  isAbandoned: boolean;
  paused: boolean;
  moveCount: number;
  undosUsed: number;
  isWon: boolean;

  // setters for hydration
  setHistory: React.Dispatch<React.SetStateAction<HistoryState>>;
  setTimeElapsedMs: React.Dispatch<React.SetStateAction<number>>;
  setHasStarted: React.Dispatch<React.SetStateAction<boolean>>;
  setStartedAtMs: React.Dispatch<React.SetStateAction<number | null>>;
  setEndedAtMs: React.Dispatch<React.SetStateAction<number | null>>;
  setIsAbandoned: React.Dispatch<React.SetStateAction<boolean>>;
  setPaused: React.Dispatch<React.SetStateAction<boolean>>;
  setMoveCount: React.Dispatch<React.SetStateAction<number>>;
  setUndosUsed: React.Dispatch<React.SetStateAction<number>>;
};

export function useInProgressGamePersistence({
  seedReady,
  gameId,
  seed,
  rules,

  history,
  timeElapsedMsRef,
  hasStarted,
  startedAtMs,
  endedAtMs,
  isAbandoned,
  paused,
  moveCount,
  undosUsed,
  isWon,

  setHistory,
  setTimeElapsedMs,
  setHasStarted,
  setStartedAtMs,
  setEndedAtMs,
  setIsAbandoned,
  setPaused,
  setMoveCount,
  setUndosUsed
}: Params) {
  const inProgressHydratedRef = useRef<boolean>(false);

  // ---------------------------------------------------------------------------
  // Hydrate in-progress game (IndexedDB)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    if (!seedReady) return;
    inProgressHydratedRef.current = false;

    (async () => {
      try {
        const saved = await getInProgressGame(gameId);
        console.log("[in-progress hydrate] done", { gameId, found: !!saved });
        if (cancelled) return;

        inProgressHydratedRef.current = true;
        if (!saved) return;

        // Restore snapshot + meta
        setHistory(saved.history);
        setTimeElapsedMs(saved.timeElapsedMs);
        setHasStarted(saved.hasStarted);
        setStartedAtMs(saved.startedAtMs);
        setEndedAtMs(saved.endedAtMs);
        setIsAbandoned(saved.isAbandoned);
        setPaused(saved.paused);
        setMoveCount(saved.moveCount);
        setUndosUsed(saved.undosUsed);

        // Optional: restore move log/cursor if you also persist it later
        // setMoves(saved.moves); setCursor(saved.cursor);
      } catch (err) {
        inProgressHydratedRef.current = true;
        console.error("Failed to hydrate in-progress game", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    seedReady,
    gameId,
    setHistory,
    setTimeElapsedMs,
    setHasStarted,
    setStartedAtMs,
    setEndedAtMs,
    setIsAbandoned,
    setPaused,
    setMoveCount,
    setUndosUsed
  ]);

  // ---------------------------------------------------------------------------
  // Persist per-move (IndexedDB)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!seedReady) return;
    if (!inProgressHydratedRef.current) return;

    if (isWon || isAbandoned) {
      deleteInProgressGame(gameId).catch(() => {});
      return;
    }

    if (!hasStarted) {
      deleteInProgressGame(gameId).catch(() => {});
      return;
    }

    console.log("[in-progress persist] writing snapshot (per-move)", {
      gameId,
      moveCount,
      undosUsed,
      timeElapsedMs: timeElapsedMsRef.current
    });

    upsertInProgressGame({
      gameId,
      seed,
      rules,
      kind: "freeplay",
      history,
      timeElapsedMs: timeElapsedMsRef.current ?? 0,
      hasStarted,
      startedAtMs,
      endedAtMs,
      isAbandoned,
      paused,
      moveCount,
      undosUsed,
      updatedAtMs: Date.now()
    }).catch((err) => {
      console.error("[in-progress persist] write failed", err);
    });
  }, [
    seedReady,
    gameId,
    seed,
    rules,
    history,
    hasStarted,
    startedAtMs,
    endedAtMs,
    isAbandoned,
    paused,
    moveCount,
    undosUsed,
    isWon,
    timeElapsedMsRef
  ]);

  // ---------------------------------------------------------------------------
  // Persist once per second between moves (IndexedDB)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!seedReady) return;
    if (!inProgressHydratedRef.current) return;

    if (isWon || isAbandoned) return;
    if (!hasStarted) return;
    if (paused) return;

    const id = window.setInterval(() => {
      if (!inProgressHydratedRef.current) return;

      console.log("[in-progress persist] writing snapshot (1s)", {
        gameId,
        moveCount,
        undosUsed,
        timeElapsedMs: timeElapsedMsRef.current
      });

      upsertInProgressGame({
        gameId,
        seed,
        rules,
        kind: "freeplay",
        history,
        timeElapsedMs: timeElapsedMsRef.current ?? 0,
        hasStarted,
        startedAtMs,
        endedAtMs,
        isAbandoned,
        paused,
        moveCount,
        undosUsed,
        updatedAtMs: Date.now()
      }).catch((err) => {
        console.error("[in-progress persist] write failed (1s)", err);
      });
    }, 1000);

    return () => {
      window.clearInterval(id);
    };
  }, [
    seedReady,
    gameId,
    seed,
    rules,
    history,
    hasStarted,
    startedAtMs,
    endedAtMs,
    isAbandoned,
    paused,
    moveCount,
    undosUsed,
    isWon,
    timeElapsedMsRef
  ]);
}
