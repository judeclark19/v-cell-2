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

      console.log("[in-progress persist] disarming due to session change", {
        prevSessionKey,
        nextSessionKey: sessionKey
      });
    }
  }, [sessionKey]);

  const lastSeenRef = useRef<{
    hasStarted: boolean;
    moveCount: number;
    movesLen: number;
    startedAtMs: number | null;
    gameId: string;
  } | null>(null);

  const logStartedDelta = (label: string) => {
    const next = {
      hasStarted,
      moveCount,
      movesLen: moves?.length ?? 0,
      startedAtMs,
      gameId
    };

    const prev = lastSeenRef.current;

    // Always store latest
    lastSeenRef.current = next;

    // If first run, just log baseline
    if (!prev) {
      console.log(`[in-progress persist][delta] ${label} (baseline)`, next);
      return;
    }

    // Only log when something important changes (esp. resets)
    const changed =
      prev.hasStarted !== next.hasStarted ||
      prev.moveCount !== next.moveCount ||
      prev.movesLen !== next.movesLen ||
      prev.startedAtMs !== next.startedAtMs ||
      prev.gameId !== next.gameId;

    if (changed) {
      console.warn(`[in-progress persist][delta] ${label}`, { prev, next });
      if (
        (prev.hasStarted ||
          prev.moveCount > 0 ||
          prev.movesLen > 0 ||
          prev.startedAtMs != null) &&
        !next.hasStarted &&
        next.moveCount === 0 &&
        next.movesLen === 0 &&
        next.startedAtMs == null
      ) {
        console.trace("[in-progress persist][delta] RESET detected");
      }
    }
  };

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
        console.log("[in-progress hydrate] loaded from IDXDB", {
          deviceId,
          hasSaved: !!saved,
          savedGameId: saved?.gameId ?? null,
          savedHasStarted: saved?.hasStarted ?? null,
          savedMoveCount: saved?.moveCount ?? null,
          savedMovesLen: saved?.moves?.length ?? null,
          savedCursor: saved?.cursor ?? null,
          savedStartedAtMs: saved?.startedAtMs ?? null,
          savedStatus: saved?.status ?? null,
          savedPaused: saved?.paused ?? null
        });
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
    logStartedDelta("per-move effect (before looksStarted)");

    const looksStarted =
      hasStarted ||
      moveCount > 0 ||
      (moves?.length ?? 0) > 0 ||
      startedAtMs != null;
    if (!looksStarted) {
      // Transient resets can happen during login/session switches.
      // If we *did* hydrate a saved record for this session, NEVER delete on a looksStarted=false window.
      if (hasSavedRef.current) {
        if (pendingDeleteTimerRef.current != null) {
          window.clearTimeout(pendingDeleteTimerRef.current);
          pendingDeleteTimerRef.current = null;
        }
        console.warn(
          "[in-progress persist] looksStarted=false but saved exists; skipping delete",
          {
            deviceId,
            uid,
            gameId,
            hasStarted,
            moveCount,
            movesLen: moves?.length ?? 0,
            startedAtMs
          }
        );
        return;
      }

      // No saved record; a looksStarted=false game is truly empty, so we can clear after a short grace.
      if (pendingDeleteTimerRef.current != null) {
        return;
      }

      console.error(
        "[in-progress persist] looksStarted=false -> scheduling delete (no saved)",
        {
          deviceId,
          uid,
          gameId,
          hasStarted,
          moveCount,
          movesLen: moves?.length ?? 0,
          startedAtMs,
          paused,
          isWon,
          isAbandoned
        }
      );

      pendingDeleteTimerRef.current = window.setTimeout(() => {
        pendingDeleteTimerRef.current = null;

        // If we got disarmed in the meantime, bail.
        if (!inProgressHydratedRef.current) return;
        if (hydratedSessionKeyRef.current !== sessionKey) return;

        // If a saved record appeared later (e.g. async hydrate), do not delete.
        if (hasSavedRef.current) {
          return;
        }

        const stillLooksStarted =
          hasStarted ||
          moveCount > 0 ||
          (moves?.length ?? 0) > 0 ||
          startedAtMs != null;

        if (stillLooksStarted) {
          console.log(
            "[in-progress persist] looksStarted recovered during grace window; not deleting",
            { gameId }
          );
          return;
        }

        console.error(
          "[in-progress persist] looksStarted still false after grace -> DELETING",
          {
            deviceId,
            uid,
            gameId
          }
        );
        console.trace(
          "[in-progress persist] delete due to looksStarted=false (post-grace)"
        );

        deleteInProgressGameForDevice(deviceId);
        if (uid) {
          deleteDoc(doc(db, "users", uid, "games", gameId)).catch(() => {});
        }
      }, 750);

      return;
    } else {
      // If we became started again, cancel any pending delete.
      if (pendingDeleteTimerRef.current != null) {
        window.clearTimeout(pendingDeleteTimerRef.current);
        pendingDeleteTimerRef.current = null;
      }
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
    if (!looksStarted) return;
    if (paused) return;
    logStartedDelta("1s effect (pre-interval)");

    const deviceId = getOrCreateDeviceId();

    const id = window.setInterval(() => {
      if (!inProgressHydratedRef.current) return;
      logStartedDelta("1s effect (inside interval tick)");
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
