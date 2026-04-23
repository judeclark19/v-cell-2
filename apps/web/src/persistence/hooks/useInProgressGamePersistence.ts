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
import { getCompletedGameBySessionId } from "../completedGamesStore";
import { isCompletedStatus } from "../reconciliation";
import { getOrCreateDeviceId } from "../schema";

import type { PersistedGame } from "../types";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/state/reduxStore";
import {
  GameStatus,
  setStatus,
  setUndosUsed,
  selectStatus,
  selectUndosUsed
} from "@/state/game/gameSlice";
import {
  selectPaused,
  setPaused,
  setStartedAtMs,
  selectStartedAtMs,
  selectEndedAtMs,
  setEndedAtMs,
  selectSessionId,
  selectTimeElapsedMs,
  setTimeElapsedMs
} from "@/state/session/sessionSlice";
import { openPauseModal } from "@/state/ui/uiSlice";
import {
  markPersistedGamePendingSync,
  syncGameToCloud
} from "../cloudSync";

type InProgressSnapshot = {
  moves: Move[];
  cursor: number;
  paused: boolean;
  moveCount: number;
  undosUsed: number;
  timeElapsedMs: number;
};

type PersistPhase = "DISARMED" | "ARMED";

type EndState = "none" | "won" | "abandoned";

type Params = {
  // identity
  uid: string | null;
  seed: string;
  rules: Rules;

  onHydrated?: (saved: PersistedGame | null) => void;
  readyToHydrate: boolean;

  // snapshot + meta
  moves: Move[];
  cursor: number;
  moveCount: number;
};

export function useInProgressGamePersistence({
  uid,
  seed,
  rules,
  onHydrated,
  moves,
  cursor,
  moveCount,
  readyToHydrate
}: Params) {
  const hydratedSessionKeyRef = useRef<string | null>(null);
  const startedAtMs = useSelector(selectStartedAtMs);
  const endedAtMs = useSelector(selectEndedAtMs);
  const undosUsed = useSelector(selectUndosUsed);
  const status = useSelector(selectStatus);
  const paused = useSelector(selectPaused);
  const timeElapsedMs = useSelector(selectTimeElapsedMs);
  const sessionId = useSelector(selectSessionId);

  const snapshotRef = useRef<InProgressSnapshot>({
    moves,
    cursor,
    paused,
    moveCount,
    undosUsed,
    timeElapsedMs
  });

  const phaseRef = useRef<PersistPhase>("DISARMED");

  const disarm = () => {
    phaseRef.current = "DISARMED";
    hydratedSessionKeyRef.current = null;
  };

  const armForSession = (key: string) => {
    phaseRef.current = "ARMED";
    hydratedSessionKeyRef.current = key;
  };

  const sessionKey = `${uid ?? "anon"}::${sessionId}::${seed}`;

  const isArmed = useCallback(() => {
    return (
      phaseRef.current === "ARMED" &&
      hydratedSessionKeyRef.current === sessionKey
    );
  }, [sessionKey]);

  // Bumps whenever hydration completes so effects that are gated by refs re-run.
  // (Refs don't trigger rerenders.)
  const [hydrationVersion, setHydrationVersion] = useState(0);

  const endState: EndState =
    status === "won" ? "won" : status === "abandoned" ? "abandoned" : "none";

  useEffect(() => {
    snapshotRef.current = {
      moves,
      cursor,
      paused,
      moveCount,
      undosUsed,
      timeElapsedMs
    };
  }, [
    moves,
    cursor,
    startedAtMs,
    endedAtMs,
    paused,
    moveCount,
    undosUsed,
    timeElapsedMs
  ]);

  const dispatch = useDispatch<AppDispatch>();

  const buildInProgressPayload = useCallback(
    (
      deviceId: string,
      updatedAtMs: number,
      snapshot: InProgressSnapshot = snapshotRef.current
    ) => {
      const { moves, cursor, paused, moveCount, undosUsed } = snapshot;

      return {
        sessionId,
        deviceId,
        seed,
        rules,
        kind: "freeplay" as const,
        moves,
        cursor,
        status: "in_progress" as GameStatus,
        timeElapsedMs: snapshot.timeElapsedMs,
        paused,
        moveCount,
        undosUsed,
        updatedAtMs,
        syncVersion: updatedAtMs,
        ...(uid ? { userId: uid } : {}),
        startedAtMs: startedAtMs ?? null,
        endedAtMs: endedAtMs ?? null
      };
    },
    [sessionId, seed, rules, uid, startedAtMs, endedAtMs]
  );

  // IMPORTANT: When the active session/sessionId changes, React state in the game layer may
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

        if (!saved) {
          onHydrated?.(null);
          armForSession(sessionKey);
          setHydrationVersion((v) => v + 1);
          return;
        }

        const completed = await getCompletedGameBySessionId(saved.sessionId);
        if (cancelled) return;

        const isBootPlaceholder =
          saved.seed === "seed-boot" ||
          saved.sessionId === "game-boot" ||
          saved.sessionId === "session-boot";

        if (
          isBootPlaceholder ||
          isCompletedStatus(saved.status) ||
          (completed && isCompletedStatus(completed.status))
        ) {
          await deleteInProgressGameForDevice(deviceId).catch(() => {});
          if (cancelled) return;

          onHydrated?.(null);
          armForSession(sessionKey);
          setHydrationVersion((v) => v + 1);
          return;
        }

        // Restore snapshot + meta (clamp cursor to move list length)
        dispatch(setTimeElapsedMs(saved.timeElapsedMs ?? 0));
        dispatch(setStartedAtMs(saved.startedAtMs ?? null));
        dispatch(setEndedAtMs(saved.endedAtMs ?? null));
        dispatch(setUndosUsed(saved.undosUsed ?? 0));
        dispatch(setStatus(saved.status ?? "in_progress"));
        dispatch(setPaused(saved.paused ?? false));
        if (saved.paused) {
          dispatch(openPauseModal());
        }
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
    sessionId,
    onHydrated,
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
      return;
    }

    const payload = buildInProgressPayload(deviceId, Date.now());
    const localPayload = uid
      ? markPersistedGamePendingSync({
          ...payload,
          startedAtMs: startedAtMs ?? null,
          endedAtMs: endedAtMs ?? null
        })
      : {
          ...payload,
          startedAtMs: startedAtMs ?? null,
          endedAtMs: endedAtMs ?? null
        };

    upsertInProgressGame(localPayload).catch((err) => {
      console.error("[in-progress persist] write failed", err);
    });

    if (uid && moves.length > 0) {
      syncGameToCloud({
        uid,
        game: localPayload,
        upsertLocal: upsertInProgressGame
      })
        .catch((err) => {
          console.error("[in-progress persist] cloud write failed", err, payload);
        });
    }
  }, [
    uid,
    readyToHydrate,
    sessionId,
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
      const payload = buildInProgressPayload(
        deviceId,
        Date.now(),
        snapshotRef.current
      );

      const localPayload = uid ? markPersistedGamePendingSync(payload) : payload;

      upsertInProgressGame(localPayload).catch((err) => {
        console.error("[in-progress persist] write failed", err);
      });
    }, 1000);

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
