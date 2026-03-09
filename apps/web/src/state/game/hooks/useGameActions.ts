import { useCallback } from "react";
import { applyMove, areAllCardsUnlocked, createGame } from "@vcell/engine";
import type { GameState, Move, Rules, UndoLimit } from "@vcell/engine";
import { getOrCreateDeviceId } from "@/persistence/schema";
import { deleteInProgressGameForDevice } from "@/persistence/inProgressGamesStore";
import type { PersistedGame } from "@/persistence/types";
import { db } from "@/lib/firebaseClient";
import { doc, setDoc } from "firebase/firestore";
import {
  applyMoveToHistory,
  hydrateHistory,
  HistoryState,
  undoHistory,
  resetTimeline,
  selectCursor,
  selectMoves,
  setUndosUsed,
  selectUndosUsed,
  selectStatus,
  setStatus
} from "@/state/game";
import { useDispatch, useSelector } from "react-redux";
import {
  selectStartedAtMs,
  setStartedAtMs,
  setEndedAtMs,
  selectEndedAtMs,
  setCheckpoint
} from "@/state/session/sessionSlice";
import {
  selectCompletedGames,
  setCompletedGames
} from "@/state/records/recordsSlice";

export type UseGameActionsParams = {
  // Core state
  history: HistoryState;
  // Session identity + rules
  seed: string;
  gameId: string;
  uid: string | null;
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
  history,
  seed,
  gameId,
  uid,
  rules,
  undoLimit,

  startNewDealSession,
  replaySeed
}: UseGameActionsParams): UseGameActionsResult {
  const dispatch = useDispatch();
  const moves = useSelector(selectMoves);
  const cursor = useSelector(selectCursor);
  const startedAtMs = useSelector(selectStartedAtMs);
  const endedAtMs = useSelector(selectEndedAtMs);
  const undosUsed = useSelector(selectUndosUsed);
  const status = useSelector(selectStatus);
  const completedGames = useSelector(selectCompletedGames);

  const dispatchMove = useCallback(
    (move: Move) => {
      // Ignore moves once a game has ended/abandoned (prevents stale commits during session transitions).
      if (status === "abandoned") return;

      // First move starts the timer clock.
      if (startedAtMs == null) {
        dispatch(setStartedAtMs(Date.now()));
      }

      let nextCursor = cursor;
      let nextMoves = moves;

      if (status !== "won") {
        dispatch(setEndedAtMs(null));
        dispatch(setStatus("in_progress"));

        // For archive/checkpoint bookkeeping, compute the post-move timeline values.
        const truncated = moves.slice(0, cursor);
        nextMoves = [...truncated, move];
        nextCursor = cursor + 1;
      }

      let next: GameState;
      try {
        next = applyMove(history.present, move);
      } catch (err) {
        console.warn("[dispatchMove] applyMove rejected move; dropping move", {
          err,
          move,
          gameId,
          seed,
          endedAtMs,
          cursor: nextCursor
        });
        return;
      }

      // If this move produces a win, stamp `endedAtMs` exactly once.
      if (status !== "won" && areAllCardsUnlocked(next)) {
        if (endedAtMs == null) {
          dispatch(setEndedAtMs(Date.now()));
        }
        dispatch(setStatus("won"));

        const archivedCursor = nextCursor;
        const archivedMoves = nextMoves;

        const completed: PersistedGame = {
          gameId,
          deviceId: getOrCreateDeviceId(),
          seed,
          rules: next.rules,
          kind: "freeplay",

          status: "won",

          startedAtMs,
          endedAtMs: Date.now(),
          timeElapsedMs: 0,
          paused: false,

          moveCount: archivedCursor,
          undosUsed,
          moves: archivedMoves,
          cursor: archivedCursor,

          updatedAtMs: Date.now(),
          ...(uid ? { userId: uid } : {})
        };

        if (completedGames.some((g) => g.gameId === gameId)) return;

        dispatch(setCompletedGames([...completedGames, completed]));

        if (uid) {
          setDoc(doc(db, "users", uid, "games", gameId), completed, {
            merge: true
          }).catch((err) => {
            console.warn(
              "[game actions] failed to write completed game to Firestore",
              err
            );
          });
        }
      }

      if (nextCursor > 0 && nextCursor % 20 === 0) {
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
      gameId,
      seed,
      startedAtMs,
      undosUsed,
      undoLimit,
      uid,
      history.present,
      dispatch,
      endedAtMs,
      completedGames
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
        const ended = Date.now();

        dispatch(setStatus("abandoned"));

        if (ended) {
          dispatch(setEndedAtMs(ended));
        }

        const archivedCursor = cursor;
        const archivedMoves = moves;

        const completed: PersistedGame = {
          gameId,
          deviceId: getOrCreateDeviceId(),
          seed,
          rules: history.present.rules,
          kind: "freeplay",

          status: "abandoned",

          startedAtMs,
          endedAtMs: ended,
          timeElapsedMs: 0,
          paused: false,

          moveCount: archivedCursor,
          undosUsed,
          moves: archivedMoves,
          cursor: archivedCursor,

          updatedAtMs: Date.now(),
          ...(uid ? { userId: uid } : {})
        };

        if (completedGames.some((g) => g.gameId === gameId)) return;

        dispatch(setCompletedGames([...completedGames, completed]));

        if (uid) {
          setDoc(doc(db, "users", uid, "games", gameId), completed, {
            merge: true
          }).catch((err) => {
            console.warn(
              "[game actions] failed to write completed game to Firestore",
              err
            );
          });
        }

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
      gameId,
      seed,
      history.present.rules,
      undosUsed,
      cursor,
      moves,
      uid,
      completedGames
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
