"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react";
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

function areRulesEqual(a: Rules, b: Rules): boolean {
  // Rules is a plain JSON-ish object in this app; compare shallow keys + values.
  const aKeys = Object.keys(a as Record<string, unknown>);
  const bKeys = Object.keys(b as Record<string, unknown>);
  if (aKeys.length !== bKeys.length) return false;

  for (const k of aKeys) {
    if (!(k in (b as Record<string, unknown>))) return false;
    if ((a as Record<string, unknown>)[k] !== (b as Record<string, unknown>)[k])
      return false;
  }

  return true;
}

type InProgressSnapshot = {
  moves: Move[];
  cursor: number;
  hasStarted: boolean;
  startedAtMs: number | null;
  endedAtMs: number | null;
  paused: boolean;
  moveCount: number;
  undosUsed: number;
};

type PersistPhase = "DISARMED" | "ARMED";

type EndState = "none" | "won" | "abandoned";

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
  const snapshotRef = useRef<InProgressSnapshot>({
    moves,
    cursor,
    hasStarted,
    startedAtMs,
    endedAtMs,
    paused,
    moveCount,
    undosUsed
  });

  const phaseRef = useRef<PersistPhase>("DISARMED");

  const disarm = () => {
    phaseRef.current = "DISARMED";
    inProgressHydratedRef.current = false;
    hydratedGameIdRef.current = null;
    hydratedSessionKeyRef.current = null;
    hasSavedRef.current = false;

    if (pendingDeleteTimerRef.current != null) {
      window.clearTimeout(pendingDeleteTimerRef.current);
      pendingDeleteTimerRef.current = null;
    }
  };

  const armForSession = (key: string) => {
    phaseRef.current = "ARMED";
    inProgressHydratedRef.current = true;
    hydratedSessionKeyRef.current = key;
  };

  const sessionKey = `${uid ?? "anon"}::${gameId}::${seed}`;

  const isArmed = useCallback(() => {
    return (
      phaseRef.current === "ARMED" &&
      hydratedSessionKeyRef.current === sessionKey
    );
  }, [sessionKey]);

  // Bumps whenever hydration completes so effects that are gated by refs re-run.
  // (Refs don't trigger rerenders.)
  const [hydrationVersion, setHydrationVersion] = useState(0);

  const endState: EndState = isWon ? "won" : isAbandoned ? "abandoned" : "none";

  useEffect(() => {
    snapshotRef.current = {
      moves,
      cursor,
      hasStarted,
      startedAtMs,
      endedAtMs,
      paused,
      moveCount,
      undosUsed
    };
  }, [
    moves,
    cursor,
    hasStarted,
    startedAtMs,
    endedAtMs,
    paused,
    moveCount,
    undosUsed
  ]);

  const buildInProgressPayload = useCallback(
    (
      deviceId: string,
      updatedAtMs: number,
      snapshot: InProgressSnapshot = snapshotRef.current
    ) => {
      const {
        moves,
        cursor,
        hasStarted,
        startedAtMs,
        endedAtMs,
        paused,
        moveCount,
        undosUsed
      } = snapshot;

      return {
        gameId,
        deviceId,
        seed,
        rules,
        kind: "freeplay" as const,
        moves,
        cursor,
        status: "in_progress" as const,
        timeElapsedMs: timeElapsedMsRef.current ?? 0,
        hasStarted,
        startedAtMs,
        endedAtMs,
        paused,
        moveCount,
        undosUsed,
        updatedAtMs,
        ...(uid ? { userId: uid } : {})
      };
    },
    [gameId, seed, rules, timeElapsedMsRef, uid]
  );

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
      disarm();
    }
  }, [sessionKey]);

  // ---------------------------------------------------------------------------
  // Hydrate in-progress game (IndexedDB)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    if (!seedReady) return;

    (async () => {
      try {
        const deviceId = getOrCreateDeviceId();
        const saved = await getInProgressGameForDevice(deviceId);
        if (cancelled) return;
        hasSavedRef.current = !!saved;

        hydratedGameIdRef.current = gameId;

        if (!saved) {
          armForSession(sessionKey);
          setHydrationVersion((v) => v + 1);
          onHydrated?.(null);
          return;
        }

        // Restore snapshot + meta (clamp cursor to move list length)
        const restoredMoves = saved.moves ?? [];
        const rawCursor = saved.cursor ?? 0;
        const safeCursor = Math.min(rawCursor, restoredMoves.length);

        setMoves(restoredMoves);
        setCursor(safeCursor);
        setTimeElapsedMs(saved.timeElapsedMs);
        setHasStarted(saved.hasStarted);
        setStartedAtMs(saved.startedAtMs);
        setEndedAtMs(saved.endedAtMs);
        setIsAbandoned(saved.status === "abandoned");
        setPaused(saved.paused);
        setMoveCount(saved.moveCount);
        setUndosUsed(saved.undosUsed);
        armForSession(sessionKey);
        setHydrationVersion((v) => v + 1);
        onHydrated?.(saved);
      } catch (err) {
        hydratedGameIdRef.current = gameId;
        armForSession(sessionKey);
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
    sessionKey,
    rules,
    uid,
    seed
  ]);

  // ---------------------------------------------------------------------------
  // Persist per-move (IndexedDB)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!seedReady) return;
    if (!isArmed()) return;

    const deviceId = getOrCreateDeviceId();

    if (endState !== "none") {
      deleteInProgressGameForDevice(
        deviceId,
        "useInProgressGamePersistence effect"
      );
      if (uid) {
        deleteDoc(doc(db, "users", uid, "games", gameId)).catch(() => {});
      }
      return;
    }

    if (!hasStarted) return;

    const payload = buildInProgressPayload(deviceId, Date.now());

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
    endState,
    paused,
    moveCount,
    undosUsed,
    timeElapsedMsRef,
    hydrationVersion,
    sessionKey,
    isArmed,
    buildInProgressPayload
  ]);

  // ---------------------------------------------------------------------------
  // Persist once per second between moves (IndexedDB)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!seedReady) return;
    if (!isArmed()) return;

    if (endState !== "none") return;
    if (!hasStarted) return;
    if (paused) return;

    const deviceId = getOrCreateDeviceId();

    const id = window.setInterval(() => {
      upsertInProgressGame(
        buildInProgressPayload(deviceId, Date.now(), snapshotRef.current)
      ).catch((err) => {
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
    sessionKey,
    isArmed,
    hasStarted,
    paused,
    endState,
    uid,
    buildInProgressPayload
  ]);
}
