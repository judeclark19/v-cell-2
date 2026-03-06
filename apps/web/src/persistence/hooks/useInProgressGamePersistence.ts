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
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/state/reduxStore";
import {
  setStartedAtMs,
  selectStartedAtMs,
  selectEndedAtMs,
  setEndedAtMs
} from "@/state/session";
import {
  GameStatus,
  selectStatus,
  selectUndosUsed,
  setStatus,
  setUndosUsed
} from "@/state/game";

type InProgressSnapshot = {
  moves: Move[];
  cursor: number;
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
  gameId: string;
  seed: string;
  rules: Rules;

  onHydrated?: (saved: PersistedGame | null) => void;
  readyToHydrate: boolean;

  // snapshot + meta
  moves: Move[];
  cursor: number;
  timeElapsedMsRef: React.RefObject<number>;
  paused: boolean;
  moveCount: number;
  isWon: boolean;

  // setters for hydration
  setTimeElapsedMs: React.Dispatch<React.SetStateAction<number>>;
  setPaused: React.Dispatch<React.SetStateAction<boolean>>;
};

export function useInProgressGamePersistence({
  uid,
  gameId,
  seed,
  rules,
  onHydrated,
  moves,
  cursor,
  timeElapsedMsRef,
  paused,
  moveCount,
  isWon,
  readyToHydrate,
  setTimeElapsedMs,
  setPaused
}: Params) {
  const inProgressHydratedRef = useRef<boolean>(false);
  const hydratedSessionKeyRef = useRef<string | null>(null);
  const pendingDeleteTimerRef = useRef<number | null>(null);
  const hasSavedRef = useRef<boolean>(false);
  const startedAtMs = useSelector(selectStartedAtMs);
  const endedAtMs = useSelector(selectEndedAtMs);
  const undosUsed = useSelector(selectUndosUsed);
  const status = useSelector(selectStatus);

  const snapshotRef = useRef<InProgressSnapshot>({
    moves,
    cursor,
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

  const endState: EndState = isWon
    ? "won"
    : status === "abandoned"
      ? "abandoned"
      : "none";

  useEffect(() => {
    snapshotRef.current = {
      moves,
      cursor,
      startedAtMs,
      endedAtMs,
      paused,
      moveCount,
      undosUsed
    };
  }, [moves, cursor, startedAtMs, endedAtMs, paused, moveCount, undosUsed]);

  const dispatch = useDispatch<AppDispatch>();

  // ---------------------------------------------------------------------------
  // Derive/stamp lifecycle timestamps from deterministic state
  // - startedAtMs is stamped on the first ever move (moves.length > 0)
  // - endedAtMs is stamped when we enter a terminal endState
  // NOTE: We never clear these here; persistence should reflect the first start.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!readyToHydrate) return;
    if (!isArmed()) return;

    // First move observed: stamp startedAtMs once.
    if (startedAtMs == null && moves.length > 0) {
      dispatch(setStartedAtMs(Date.now()));
    }

    // Terminal state reached: stamp endedAtMs once.
    if (endState !== "none" && endedAtMs == null) {
      dispatch(setEndedAtMs(Date.now()));
    }
  }, [
    readyToHydrate,
    isArmed,
    moves.length,
    startedAtMs,
    endState,
    endedAtMs,
    dispatch
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
        status: "in_progress" as GameStatus,
        timeElapsedMs: timeElapsedMsRef.current ?? 0,
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

    if (!readyToHydrate) return;

    (async () => {
      try {
        const deviceId = getOrCreateDeviceId();
        const saved = await getInProgressGameForDevice(deviceId);
        if (cancelled) return;
        hasSavedRef.current = !!saved;

        if (!saved) {
          onHydrated?.(null);
          armForSession(sessionKey);
          setHydrationVersion((v) => v + 1);
          return;
        }

        // Restore snapshot + meta (clamp cursor to move list length)
        setTimeElapsedMs(saved.timeElapsedMs);
        dispatch(setStartedAtMs(saved.startedAtMs));
        dispatch(setEndedAtMs(saved.endedAtMs));
        dispatch(setUndosUsed(saved.undosUsed));
        dispatch(setStatus(saved.status));
        setPaused(saved.paused);
        onHydrated?.(saved);
        armForSession(sessionKey);
        setHydrationVersion((v) => v + 1);
      } catch (err) {
        onHydrated?.(null);
        armForSession(sessionKey);
        setHydrationVersion((v) => v + 1);
        console.error("Failed to hydrate in-progress game", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    readyToHydrate,
    gameId,
    onHydrated,
    setTimeElapsedMs,
    setPaused,
    sessionKey,
    rules,
    uid,
    seed,
    dispatch
  ]);

  // ---------------------------------------------------------------------------
  // Persist per-move (IndexedDB)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!readyToHydrate) return;
    if (!isArmed()) return;

    const deviceId = getOrCreateDeviceId();

    if (endState !== "none") {
      deleteInProgressGameForDevice(deviceId);
      if (uid) {
        deleteDoc(doc(db, "users", uid, "games", gameId)).catch(() => {});
      }
      return;
    }

    // Persist once we've seen at least one move (even if the user undoes back to the start).
    if (moves.length === 0) return;

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
    readyToHydrate,
    gameId,
    seed,
    rules,
    moves,
    cursor,
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
    if (!readyToHydrate) return;
    if (!isArmed()) return;

    if (endState !== "none") return;
    // Persist once we've seen at least one move (even if the user undoes back to the start).
    if (moves.length === 0) return;
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
    readyToHydrate,
    sessionKey,
    isArmed,
    paused,
    endState,
    uid,
    buildInProgressPayload,
    moves.length
  ]);
}
