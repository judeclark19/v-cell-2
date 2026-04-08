"use client";

import { useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import InProgressPersistenceDriver from "./InProgressPersistenceDriver";
import SessionTimerDriver from "./SessionTimerDriver";
import {
  selectCursor,
  selectMoveCount,
  selectMoves,
  selectRules,
  selectSeed,
  setStatus,
  setUndosUsed
} from "./gameSlice";
import { useGameSnapshotLogger } from "./hooks/useGameSnapshotLogger";
import { useLoginReconcileInProgressGame } from "./hooks/useLoginReconcileInProgressGame";
import { selectUid } from "../auth/authSlice";
import { AppDispatch } from "../reduxStore";
import {
  selectSessionId,
  selectSessionPhase,
  selectStartedAtMs,
  setCheckpoint,
  setStartedAtMs,
  setTimeElapsedMs
} from "../session/sessionSlice";
import { bootSession } from "../session/thunks/bootSession";
import { transitionGameAndSession } from "../transitionGameAndSession";
import { safeRandomId } from "../utils";
import { setIsAnyModalOpen } from "../ui/uiSlice";
import { useCompletedGamesHydration } from "../records/useCompletedGamesHydration";
import { selectAuthReady } from "../auth/authSlice";
import { useReconnectCloudSync } from "@/persistence/hooks/useReconnectCloudSync";

export function GameLifecycle() {
  const dispatch = useDispatch<AppDispatch>();

  const uid = useSelector(selectUid);
  const authReady = useSelector(selectAuthReady);

  const sessionId = useSelector(selectSessionId);
  const sessionPhase = useSelector(selectSessionPhase);
  const startedAtMs = useSelector(selectStartedAtMs);

  const seed = useSelector(selectSeed);
  const rules = useSelector(selectRules);
  const moves = useSelector(selectMoves);
  const cursor = useSelector(selectCursor);
  const moveCount = useSelector(selectMoveCount);

  const didBootstrapRef = useRef(false);
  const prevUidRef = useRef<string | null>(uid);

  const startNewDealSession = useCallback(() => {
    dispatch(
      transitionGameAndSession({
        seed: safeRandomId(),
        rules
      })
    );
  }, [dispatch, rules]);

  useLoginReconcileInProgressGame();
  useCompletedGamesHydration();
  useReconnectCloudSync(uid, authReady);

  useEffect(() => {
    if (seed !== "seed-boot" && sessionId !== "session-boot") return;
    if (didBootstrapRef.current) return;
    didBootstrapRef.current = true;

    dispatch(setTimeElapsedMs(0));
    dispatch(setStatus("in_progress"));
    dispatch(setCheckpoint(null));
    dispatch(setUndosUsed(0));
    dispatch(setStartedAtMs(null));

    dispatch(bootSession({ rules })).catch((err) => {
      console.error("bootSession failed", err);
    });

    return () => {
      didBootstrapRef.current = false;
    };
  }, [dispatch, rules, seed, sessionId]);

  useEffect(() => {
    if (sessionPhase !== "ready") return;

    const prevUid = prevUidRef.current;
    const didJustLogout = prevUid !== null && uid === null;

    prevUidRef.current = uid;

    if (!didJustLogout) return;
    if (!startedAtMs) return;

    queueMicrotask(() => {
      dispatch(setIsAnyModalOpen(false));
      startNewDealSession();
    });
  }, [dispatch, uid, sessionPhase, startedAtMs, startNewDealSession]);

  useGameSnapshotLogger();

  return (
    <>
      <SessionTimerDriver />
      <InProgressPersistenceDriver
        readyToHydrate={!!sessionId && !!seed}
        rules={rules}
        moves={moves}
        cursor={cursor}
        moveCount={moveCount}
        uid={uid}
        seed={seed}
      />
    </>
  );
}
