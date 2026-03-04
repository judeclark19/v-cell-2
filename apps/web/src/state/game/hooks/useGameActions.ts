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
  selectMoves
} from "@/state/game";
import { useDispatch, useSelector } from "react-redux";

export type UseGameActionsParams = {
  // Core state
  history: HistoryState;
  // Session identity + rules
  seed: string;
  gameId: string;
  uid: string | null;
  rules: Rules;
  undoLimit: UndoLimit;

  // Derived
  isWon: boolean;
  isAbandoned: boolean;
  hasStarted: boolean;
  endedAtMs: number | null;

  // Run state setters
  setHasStarted: React.Dispatch<React.SetStateAction<boolean>>;
  setStartedAtMs: React.Dispatch<React.SetStateAction<number | null>>;
  setEndedAtMs: React.Dispatch<React.SetStateAction<number | null>>;
  setIsAbandoned: React.Dispatch<React.SetStateAction<boolean>>;

  // Analytics / logs
  undosUsed: number;
  setUndosUsed: React.Dispatch<React.SetStateAction<number>>;

  setCheckpoint: React.Dispatch<
    React.SetStateAction<{ at: number; state: GameState } | null>
  >;

  // Completed games archive (Phase A)
  setCompletedGames: React.Dispatch<React.SetStateAction<PersistedGame[]>>;

  // Timing values captured in archive
  timeElapsedMs: number;
  startedAtMs: number | null;

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

  isWon,
  isAbandoned,
  hasStarted,
  endedAtMs,

  setHasStarted,
  setStartedAtMs,
  setEndedAtMs,
  setIsAbandoned,

  undosUsed,
  setUndosUsed,

  setCheckpoint,

  setCompletedGames,

  timeElapsedMs,
  startedAtMs,

  startNewDealSession,
  replaySeed
}: UseGameActionsParams): UseGameActionsResult {
  const dispatch = useDispatch();
  const moves = useSelector(selectMoves);
  const cursor = useSelector(selectCursor);

  const dispatchMove = useCallback(
    (move: Move) => {
      // Ignore moves once a game has ended/abandoned (prevents stale commits during session transitions).
      if (isAbandoned) return;

      // First move starts the timer clock.
      setHasStarted(true);
      setStartedAtMs((prev) => (prev == null ? Date.now() : prev));

      let nextCursor = cursor;
      let nextMoves = moves;

      if (!isWon) {
        setEndedAtMs(null);
        setIsAbandoned(false);

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
          isWon,
          endedAtMs,
          cursor: nextCursor
        });
        return;
      }

      // If this move produces a win, stamp `endedAtMs` exactly once.
      if (!isWon && areAllCardsUnlocked(next)) {
        const ended = Date.now();
        setEndedAtMs((prev) => (prev == null ? ended : prev));

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
          endedAtMs: ended,
          timeElapsedMs,
          hasStarted: true,
          paused: false,

          moveCount: archivedCursor,
          undosUsed,
          moves: archivedMoves,
          cursor: archivedCursor,

          updatedAtMs: Date.now(),
          ...(uid ? { userId: uid } : {})
        };

        setCompletedGames((prev) => {
          if (prev.some((g) => g.gameId === gameId)) return prev;
          return [...prev, completed];
        });

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
        setCheckpoint({ at: nextCursor, state: next });
      }

      // Update engine history in RTK (present + undo stack).
      dispatch(applyMoveToHistory({ move, undoLimit, isWon }));
    },
    [
      setHasStarted,
      setStartedAtMs,
      isWon,
      endedAtMs,
      isAbandoned,
      setEndedAtMs,
      setIsAbandoned,
      cursor,
      moves,
      gameId,
      seed,
      setCompletedGames,
      startedAtMs,
      timeElapsedMs,

      undosUsed,
      undoLimit,
      setCheckpoint,
      uid,
      history.present,
      dispatch
    ]
  );

  const restart = useCallback(() => {
    // Restart should reset the deal back to its original position and clear history,
    // but it should NOT affect the timer.
    dispatch(hydrateHistory({ present: createGame(seed, rules), past: [] }));
    dispatch(resetTimeline());
    setUndosUsed(0);
    setCheckpoint(null);
    setEndedAtMs(null);
    setIsAbandoned(false);
  }, [
    seed,
    rules,
    setUndosUsed,
    setCheckpoint,
    setEndedAtMs,
    setIsAbandoned,
    dispatch
  ]);

  const abandonIfNeededThenStart = useCallback(
    (startNext: () => void) => {
      // If a game is in progress, abandon it first so it gets archived.
      const isFinished = isWon || isAbandoned || endedAtMs != null;

      const start = () => {
        const deviceId = getOrCreateDeviceId();
        deleteInProgressGameForDevice(deviceId).catch(() => {});
        startNext();
      };

      if (hasStarted && !isFinished) {
        const ended = Date.now();

        setIsAbandoned(true);
        setEndedAtMs((prev) => (prev == null ? ended : prev));

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
          timeElapsedMs,
          hasStarted: true,
          paused: false,

          moveCount: archivedCursor,
          undosUsed,
          moves: archivedMoves,
          cursor: archivedCursor,

          updatedAtMs: Date.now(),
          ...(uid ? { userId: uid } : {})
        };

        setCompletedGames((prev) => {
          if (prev.some((g) => g.gameId === gameId)) return prev;
          return [...prev, completed];
        });

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
      isWon,
      isAbandoned,
      endedAtMs,
      hasStarted,
      setIsAbandoned,
      setEndedAtMs,
      setCompletedGames,
      gameId,
      seed,
      history.present.rules,
      startedAtMs,
      timeElapsedMs,
      undosUsed,
      cursor,
      moves,
      uid
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
    if (isWon) return;

    // Nothing to undo.
    if (history.past.length === 0) return;

    // Enforce undo limit.
    if (undoLimit !== "unlimited" && undosUsed >= undoLimit) return;

    // Count a successful undo exactly once (outside the history updater).
    setUndosUsed((n) => n + 1);

    dispatch(undoHistory());
  }, [
    isWon,
    history.past.length,
    undoLimit,
    undosUsed,
    setUndosUsed,
    dispatch
  ]);

  return { dispatchMove, restart, newDeal, startBySeed, undo };
}
