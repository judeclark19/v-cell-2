"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  const hydratedGameIdRef = useRef<string | null>(null);
  const hydratedSessionKeyRef = useRef<string | null>(null);
  const pendingDeleteTimerRef = useRef<number | null>(null);
  const hasSavedRef = useRef<boolean>(false);

  // Bumps whenever hydration completes so effects that are gated by refs re-run.
  // (Refs don't trigger rerenders.)
  const [hydrationVersion, setHydrationVersion] = useState(0);

  const sessionKey = `${uid ?? "anon"}::${gameId}::${seed}`;

  // IMPORTANT: When the active session/gameId changes, React state in the game layer may
  // temporarily reset to initial values before IDXDB/cloud hydration re-applies moves.
  // During that brief window we must NOT run persistence/delete logic.
  //
  // NOTE: This must run outside render (React warns if refs are read/written during render).
  // We use a layout effect so it runs in the same commit, before the per-move/interval effects below.
  useLayoutEffect(() => {
    // Any change in identity/session inputs can briefly reset React state to initial values.
    // We disarm persistence until hydration completes for the new session.
    if (hydratedSessionKeyRef.current !== sessionKey) {
      const prevSessionKey = hydratedSessionKeyRef.current;

      inProgressHydratedRef.current = false;
      hydratedGameIdRef.current = null;
      hydratedSessionKeyRef.current = null;
      hasSavedRef.current = false;

      if (pendingDeleteTimerRef.current != null) {
        window.clearTimeout(pendingDeleteTimerRef.current);
        pendingDeleteTimerRef.current = null;
      }
    }
  }, [sessionKey]);

  const lastSeenRef = useRef<{
    hasStarted: boolean;
    moveCount: number;
    movesLen: number;
    startedAtMs: number | null;
    gameId: string;
  } | null>(null);

  // ---------------------------------------------------------------------------
  // Hydrate in-progress game (IndexedDB)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    if (!seedReady) return;
    inProgressHydratedRef.current = false;
    hydratedGameIdRef.current = null;
    hydratedSessionKeyRef.current = null;
    hasSavedRef.current = false;
    if (pendingDeleteTimerRef.current != null) {
      window.clearTimeout(pendingDeleteTimerRef.current);
      pendingDeleteTimerRef.current = null;
    }

    (async () => {
      try {
        const deviceId = getOrCreateDeviceId();
        const saved = await getInProgressGameForDevice(deviceId);
        if (cancelled) return;
        hasSavedRef.current = !!saved;

        hydratedGameIdRef.current = gameId;
        inProgressHydratedRef.current = true;
        hydratedSessionKeyRef.current = sessionKey;
        setHydrationVersion((v) => v + 1);

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
        hydratedGameIdRef.current = gameId;
        inProgressHydratedRef.current = true;
        hydratedSessionKeyRef.current = sessionKey;
        setHydrationVersion((v) => v + 1);
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
    setCursor,
    sessionKey
  ]);

  // ---------------------------------------------------------------------------
  // Persist per-move (IndexedDB)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!seedReady) return;
    if (!inProgressHydratedRef.current) return;
    if (hydratedSessionKeyRef.current !== sessionKey) return;

    const deviceId = getOrCreateDeviceId();

    if (isWon || isAbandoned) {
      deleteInProgressGameForDevice(
        deviceId,
        "useInProgressGamePersistence effect"
      );
      if (uid) {
        deleteDoc(doc(db, "users", uid, "games", gameId)).catch(() => {});
      }
      return;
    }

    const looksStarted =
      hasStarted ||
      moveCount > 0 ||
      (moves?.length ?? 0) > 0 ||
      startedAtMs != null;

    if (!looksStarted) return;

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
    timeElapsedMsRef,
    hydrationVersion,
    sessionKey
  ]);

  // ---------------------------------------------------------------------------
  // Persist once per second between moves (IndexedDB)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!seedReady) return;
    if (!inProgressHydratedRef.current) return;
    if (hydratedSessionKeyRef.current !== sessionKey) return;

    if (isWon || isAbandoned) return;
    const looksStarted =
      hasStarted ||
      moveCount > 0 ||
      (moves?.length ?? 0) > 0 ||
      startedAtMs != null;
    console.log("LOOKS STARTED?", looksStarted);
    if (!looksStarted) return;
    if (paused) return;

    const deviceId = getOrCreateDeviceId();

    const id = window.setInterval(() => {
      if (!inProgressHydratedRef.current) return;

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

    if (pendingDeleteTimerRef.current != null) {
      window.clearTimeout(pendingDeleteTimerRef.current);
      pendingDeleteTimerRef.current = null;
    }

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
    timeElapsedMsRef,
    hydrationVersion,
    sessionKey
  ]);
}
