import { useCallback } from "react";
import { createGame } from "@vcell/engine";
import type { Move, Rules, UndoLimit } from "@vcell/engine";
import { getOrCreateDeviceId } from "@/persistence/schema";
import { deleteInProgressGameForDevice } from "@/persistence/inProgressGamesStore";

import {
  applyMoveToHistory,
  hydrateHistory,
  undoHistory,
  resetTimeline,
  setUndosUsed,
  setStatus,
  selectCursor,
  selectMoves,
  selectUndosUsed,
  selectStatus,
  selectHistory,
  selectSeed
} from "@/state/game/gameSlice";

import { useDispatch, useSelector } from "react-redux";
import {
  selectStartedAtMs,
  setStartedAtMs,
  setEndedAtMs,
  selectEndedAtMs,
  setCheckpoint,
  selectTimeElapsedMs
} from "@/state/session/sessionSlice";

import { AppDispatch } from "@/state/reduxStore";
import { archiveCompletedGame as archiveCompletedGameThunk } from "@/state/records/thunks/archiveCompletedGame";

import { computePostMoveResult } from "@/state/game/utils";
import { useSession } from "@/state/session/SessionProvider";

export type UseGameActionsParams = {
  // Session identity + rules
  sessionId: string;
  rules: Rules;
  undoLimit: UndoLimit;

  // Session transition
  startNewDealSession: () => void;
  replaySeed: (seed: string) => void;
};

export type UseGameActionsResult = {
  dispatchMove: (move: Move) => void;
  restart: () => void;
  newDeal: () => void;
  startBySeed: (seed: string) => void;
  undo: () => void;
};

/**
 * Owns the game "actions" (moves, undo, restart, new deal) and the bookkeeping
 * that goes with them.
 *
 * This is intentionally a mechanical extraction from GameProvider.
 */
export function useGameActions({
  sessionId,
  rules,
  undoLimit,

  startNewDealSession,
  replaySeed
}: UseGameActionsParams): UseGameActionsResult {
  const { uid } = useSession();

  const dispatch = useDispatch<AppDispatch>();

  // Session state
  const startedAtMs = useSelector(selectStartedAtMs);
  const endedAtMs = useSelector(selectEndedAtMs);
  const timeElapsedMs = useSelector(selectTimeElapsedMs);

  // Game state
  const seed = useSelector(selectSeed);
  const moves = useSelector(selectMoves);
  const cursor = useSelector(selectCursor);
  const undosUsed = useSelector(selectUndosUsed);
  const status = useSelector(selectStatus);
  const history = useSelector(selectHistory);

  const dispatchMove = useCallback(
    (move: Move) => {
      // Ignore moves once a game has ended/abandoned (prevents stale commits during session transitions).
      if (status === "abandoned") return;

      // First move starts the timer clock.
      if (startedAtMs == null) {
        dispatch(setStartedAtMs(Date.now()));
      }

      let resolved: ReturnType<
        typeof import("@/state/game/utils").computePostMoveResult
      >;
      try {
        resolved = computePostMoveResult({
          moveToApply: move,
          currentCursor: cursor,
          currentMoves: moves,
          currentStatus: status,
          currentPresent: history.present
        });
      } catch (err) {
        console.warn("[dispatchMove] applyMove rejected move; dropping move", {
          err,
          move,
          sessionId,
          seed,
          cursor
        });
        return;
      }

      const { next, nextMoves, nextCursor, didWin, shouldCheckpoint } =
        resolved;

      const endedAtMs = didWin ? Date.now() : null;

      if (status !== "won") {
        dispatch(setEndedAtMs(null));
        dispatch(setStatus("in_progress"));
      }

      if (didWin) {
        if (endedAtMs != null) {
          dispatch(setEndedAtMs(endedAtMs));
        }

        dispatch(setStatus("won"));

        dispatch(
          archiveCompletedGameThunk({
            sessionId,
            deviceId: getOrCreateDeviceId(),
            seed,
            rules: next.rules,
            finalStatus: "won",
            cursor: nextCursor,
            moves: nextMoves,
            startedAtMs,
            endedAtMs: endedAtMs ?? Date.now(),
            timeElapsedMs,
            undosUsed,
            uid
          })
        );
      }

      if (shouldCheckpoint) {
        dispatch(setCheckpoint({ at: nextCursor, state: next }));
      }

      // Update engine history in RTK (present + undo stack).
      dispatch(
        applyMoveToHistory({ move, undoLimit, isWon: status === "won" })
      );
    },
    [
      status,
      cursor,
      moves,
      sessionId,
      seed,
      startedAtMs,
      undoLimit,
      history.present,
      dispatch,
      timeElapsedMs,
      undosUsed,
      uid
    ]
  );

  const restart = useCallback(() => {
    // Restart should reset the deal back to its original position and clear history,
    // but it should NOT affect the timer.
    dispatch(hydrateHistory({ present: createGame(seed, rules), past: [] }));
    dispatch(resetTimeline());
    dispatch(setUndosUsed(0));
    dispatch(setCheckpoint(null));
    dispatch(setEndedAtMs(null));
    dispatch(setStatus("in_progress"));
  }, [seed, rules, dispatch]);

  const abandonIfNeededThenStart = useCallback(
    (startNext: () => void) => {
      // If a game is in progress, abandon it first so it gets archived.
      const isFinished =
        status === "won" || status === "abandoned" || endedAtMs != null;

      const start = () => {
        const deviceId = getOrCreateDeviceId();
        deleteInProgressGameForDevice(deviceId).catch(() => {});
        startNext();
      };

      if (startedAtMs && !isFinished) {
        dispatch(setStatus("abandoned"));
        const endedAtMs = Date.now();
        dispatch(setEndedAtMs(endedAtMs));

        const archivedCursor = cursor;
        const archivedMoves = moves;

        dispatch(
          archiveCompletedGameThunk({
            sessionId,
            deviceId: getOrCreateDeviceId(),
            seed,
            rules: history.present.rules,
            finalStatus: "abandoned",
            cursor: archivedCursor,
            moves: archivedMoves,
            startedAtMs,
            endedAtMs,
            timeElapsedMs,
            undosUsed,
            uid
          })
        );

        start();
        return;
      }

      // Otherwise just start immediately.
      start();
    },
    [
      dispatch,
      startedAtMs,
      endedAtMs,
      status,
      history.present.rules,
      cursor,
      moves,
      timeElapsedMs,
      undosUsed,
      uid,
      seed,
      sessionId
    ]
  );

  const newDeal = useCallback(() => {
    abandonIfNeededThenStart(() => {
      startNewDealSession();
    });
  }, [abandonIfNeededThenStart, startNewDealSession]);

  const startBySeed = useCallback(
    (nextSeed: string) => {
      const normalized = nextSeed.trim();
      if (!normalized) return;

      abandonIfNeededThenStart(() => {
        replaySeed(normalized);
      });
    },
    [abandonIfNeededThenStart, replaySeed]
  );

  const undo = useCallback(() => {
    // Once the game is won, undo is disabled.
    if (status === "won") return;

    // Nothing to undo.
    if (history.past.length === 0) return;

    // Enforce undo limit.
    if (undoLimit !== "unlimited" && undosUsed >= undoLimit) return;

    // Count a successful undo exactly once (outside the history updater).
    // dispatch(setUndosUsed(undosUsed + 1));

    dispatch(undoHistory());
  }, [status, history.past.length, undoLimit, undosUsed, dispatch]);

  return { dispatchMove, restart, newDeal, startBySeed, undo };
}
