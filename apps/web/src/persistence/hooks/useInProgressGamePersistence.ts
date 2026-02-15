"use client";

import { useEffect, useRef } from "react";
import type { Move, Rules } from "@vcell/engine";
import {
  getInProgressGameForDevice,
  upsertInProgressGame,
  deleteInProgressGameForDevice
} from "../inProgressGamesStore";
import { getOrCreateDeviceId } from "../schema";

type Params = {
  // identity
  seedReady: boolean;
  gameId: string;
  seed: string;
  rules: Rules;

  // snapshot + meta
  moves: Move[];
  cursor: number;
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
  setMoves: React.Dispatch<React.SetStateAction<Move[]>>;
  setCursor: React.Dispatch<React.SetStateAction<number>>;
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

  moves,
  cursor,
  timeElapsedMsRef,
  hasStarted,
  startedAtMs,
  endedAtMs,
  isAbandoned,
  paused,
  moveCount,
  undosUsed,
  isWon,

  setMoves,
  setCursor,
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
        const deviceId = getOrCreateDeviceId();
        const saved = await getInProgressGameForDevice(deviceId);
        if (cancelled) return;

        inProgressHydratedRef.current = true;
        if (!saved) return;

        // Restore snapshot + meta
        setMoves(saved.moves);
        setCursor(saved.cursor);
        setTimeElapsedMs(saved.timeElapsedMs);
        setHasStarted(saved.hasStarted);
        setStartedAtMs(saved.startedAtMs);
        setEndedAtMs(saved.endedAtMs);
        setIsAbandoned(saved.status === "abandoned");
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
    setTimeElapsedMs,
    setHasStarted,
    setStartedAtMs,
    setEndedAtMs,
    setIsAbandoned,
    setPaused,
    setMoveCount,
    setUndosUsed,
    setMoves,
    setCursor
  ]);

  // ---------------------------------------------------------------------------
  // Persist per-move (IndexedDB)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!seedReady) return;
    if (!inProgressHydratedRef.current) return;

    const deviceId = getOrCreateDeviceId();

    if (isWon || isAbandoned) {
      deleteInProgressGameForDevice(deviceId);
      return;
    }

    if (!hasStarted) {
      deleteInProgressGameForDevice(deviceId);
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
      deviceId,
      seed,
      rules,
      kind: "freeplay",
      moves,
      cursor,
      status: "in_progress",
      timeElapsedMs: timeElapsedMsRef.current ?? 0,
      hasStarted,
      startedAtMs,
      endedAtMs,
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
    moves,
    cursor,
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

    const deviceId = getOrCreateDeviceId();

    const id = window.setInterval(() => {
      if (!inProgressHydratedRef.current) return;

      // console.log("[in-progress persist] writing snapshot (1s)", {
      //   gameId,
      //   moveCount,
      //   undosUsed,
      //   timeElapsedMs: timeElapsedMsRef.current
      // });

      upsertInProgressGame({
        gameId,
        deviceId,
        seed,
        rules,
        kind: "freeplay",
        moves,
        cursor,
        status: "in_progress",
        timeElapsedMs: timeElapsedMsRef.current ?? 0,
        hasStarted,
        startedAtMs,
        endedAtMs,
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
    moves,
    cursor,
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
