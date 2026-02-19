"use client";

import { useEffect, useRef } from "react";
import type { Move, Rules } from "@vcell/engine";
import {
  getInProgressGameForDevice,
  upsertInProgressGame,
  deleteInProgressGameForDevice
} from "../inProgressGamesStore";
import { getOrCreateDeviceId } from "../schema";

import { db } from "@/lib/firebaseClient";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import type { PersistedGame } from "../types";

type Params = {
  // identity
  uid: string | null;
  seedReady: boolean;
  gameId: string;
  seed: string;
  rules: Rules;

  onHydrated?: (saved: PersistedGame | null) => void;

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
  uid,
  seedReady,
  gameId,
  seed,
  rules,
  onHydrated,
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
        if (!saved) {
          onHydrated?.(null);
          return;
        }

        // Restore snapshot + meta
        setMoves(saved.moves ?? []);
        setCursor(saved.cursor ?? 0);
        setTimeElapsedMs(saved.timeElapsedMs);
        setHasStarted(saved.hasStarted);
        setStartedAtMs(saved.startedAtMs);
        setEndedAtMs(saved.endedAtMs);
        setIsAbandoned(saved.status === "abandoned");
        setPaused(saved.paused);
        setMoveCount(saved.moveCount);
        setUndosUsed(saved.undosUsed);
        onHydrated?.(saved);
      } catch (err) {
        inProgressHydratedRef.current = true;
        onHydrated?.(null);
        console.error("Failed to hydrate in-progress game", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    seedReady,
    gameId,
    onHydrated,
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
      console.warn(
        "[in-progress persist] deleting in-progress (won/abandoned)",
        {
          deviceId,
          gameId,
          isWon,
          isAbandoned
        }
      );
      deleteInProgressGameForDevice(deviceId);
      if (uid) {
        deleteDoc(doc(db, "users", uid, "games", gameId)).catch(() => {});
      }
      return;
    }

    console.log("[in-progress persist] started flags", {
      hasStarted,
      moveCount,
      movesLen: moves?.length ?? 0,
      startedAtMs
    });

    const looksStarted =
      hasStarted ||
      moveCount > 0 ||
      (moves?.length ?? 0) > 0 ||
      startedAtMs != null;

    if (!looksStarted) {
      deleteInProgressGameForDevice(deviceId);
      if (uid) {
        deleteDoc(doc(db, "users", uid, "games", gameId)).catch(() => {});
      }
      return;
    }

    console.log("[in-progress persist] writing snapshot (per-move)", {
      gameId,
      moveCount,
      undosUsed,
      timeElapsedMs: timeElapsedMsRef.current
    });

    const payload = {
      gameId,
      deviceId,
      seed,
      rules,
      kind: "freeplay" as const,
      moves,
      cursor,
      status: "in_progress" as const,
      timeElapsedMs: timeElapsedMsRef.current ?? 0,
      hasStarted: looksStarted,
      startedAtMs,
      endedAtMs,
      paused,
      moveCount,
      undosUsed,
      updatedAtMs: Date.now(),
      ...(uid ? { userId: uid } : {})
    };

    upsertInProgressGame(payload).catch((err) => {
      console.error("[in-progress persist] write failed", err);
    });

    if (uid) {
      setDoc(doc(db, "users", uid, "games", gameId), payload, {
        merge: true
      }).catch(() => {});
    }
  }, [
    uid,
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
    const looksStarted =
      hasStarted ||
      moveCount > 0 ||
      (moves?.length ?? 0) > 0 ||
      startedAtMs != null;
    if (!looksStarted) return;
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

      if (!looksStarted) return;

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
        hasStarted: looksStarted,
        startedAtMs,
        endedAtMs,
        paused,
        moveCount,
        undosUsed,
        updatedAtMs: Date.now(),
        ...(uid ? { userId: uid } : {})
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
    uid,
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
