import { useCallback } from "react";
import { applyMove, areAllCardsUnlocked, createGame } from "@vcell/engine";
import type { GameState, Move, Rules, UndoLimit } from "@vcell/engine";
import { HistoryState } from "../GameProvider";
import { getOrCreateDeviceId } from "@/persistence/schema";
import { deleteInProgressGameForDevice } from "@/persistence/inProgressGamesStore";
import type { PersistedGame } from "@/persistence/types";
import { db } from "@/lib/firebaseClient";
import { doc, setDoc } from "firebase/firestore";

function undoLimitToCap(undoLimit: UndoLimit): number {
  if (undoLimit === "unlimited") return Number.POSITIVE_INFINITY;
  return undoLimit;
}

export type UseGameActionsParams = {
  // Core state
  state: GameState;
  history: HistoryState;
  setHistory: React.Dispatch<React.SetStateAction<HistoryState>>;

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
  moveCount: number;
  setMoveCount: React.Dispatch<React.SetStateAction<number>>;

  moves: Move[];
  setMoves: React.Dispatch<React.SetStateAction<Move[]>>;
  cursor: number;
  setCursor: React.Dispatch<React.SetStateAction<number>>;
  cursorRef: React.RefObject<number>;
  movesRef: React.RefObject<Move[]>;

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
  state,
  history,
  setHistory,

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
  setMoveCount,

  setMoves,
  setCursor,
  cursorRef,
  movesRef,

  setCheckpoint,

  setCompletedGames,

  timeElapsedMs,
  startedAtMs,

  startNewDealSession,
  replaySeed
}: UseGameActionsParams): UseGameActionsResult {
  const dispatchMove = useCallback(
    (move: Move) => {
      // Ignore moves once a game has ended/abandoned (prevents stale commits during session transitions).
      if (isAbandoned) return;

      // First move starts the timer clock.
      setHasStarted(true);
      setStartedAtMs((prev) => (prev == null ? Date.now() : prev));

      // If the game isn't finished yet, a move means we're actively playing (not abandoned).
      // Post-win cosmetic moves should NOT clear `endedAtMs`.
      if (!isWon) {
        setEndedAtMs(null);
        setIsAbandoned(false);
        setMoveCount((n) => n + 1);
        const baseCursor = cursorRef.current;

        const truncated = movesRef.current.slice(0, baseCursor);
        const nextMoves = [...truncated, move];
        movesRef.current = nextMoves;
        setMoves(nextMoves);

        const nextCursor = baseCursor + 1;
        cursorRef.current = nextCursor;
        setCursor(nextCursor);
      }

      setHistory((h) => {
        let next: GameState;
        try {
          next = applyMove(h.present, move);
        } catch (err) {
          console.warn(
            "[dispatchMove] applyMove rejected move; dropping move",
            {
              err,
              move,
              gameId,
              seed,
              isWon,
              endedAtMs,
              cursor: cursorRef.current
            }
          );
          return h;
        }

        // If this move produces a win, stamp `endedAtMs` exactly once.
        if (!isWon && areAllCardsUnlocked(next)) {
          const ended = Date.now();
          setEndedAtMs((prev) => (prev == null ? ended : prev));

          const archivedCursor = cursorRef.current;
          const archivedMoves = movesRef.current;

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

        // After a win, allow cosmetic moves but do not mutate undo history.
        if (isWon) {
          return { present: next, past: h.past };
        }

        const cap = undoLimitToCap(undoLimit);
        const nextPast = [...h.past, h.present];

        if (Number.isFinite(cap) && nextPast.length > cap) {
          // Keep the most recent `cap` states.
          nextPast.splice(0, nextPast.length - cap);
        }

        if (cursorRef.current > 0 && cursorRef.current % 20 === 0) {
          setCheckpoint({ at: cursorRef.current, state: next });
        }

        return {
          present: next,
          past: nextPast
        };
      });
    },
    [
      setHasStarted,
      setStartedAtMs,
      isWon,
      endedAtMs,
      isAbandoned,
      setEndedAtMs,
      setIsAbandoned,
      setMoveCount,
      cursorRef,
      setMoves,
      setCursor,
      setHistory,
      gameId,
      seed,
      setCompletedGames,
      startedAtMs,
      timeElapsedMs,

      undosUsed,
      undoLimit,
      setCheckpoint,
      movesRef,
      uid
    ]
  );

  const restart = useCallback(() => {
    // Restart should reset the deal back to its original position and clear history,
    // but it should NOT affect the timer.
    setHistory({ present: createGame(seed, rules), past: [] });
    setUndosUsed(0);
    setMoveCount(0);
    setMoves([]);
    movesRef.current = [];
    setCursor(0);
    cursorRef.current = 0;
    setCheckpoint(null);
    setEndedAtMs(null);
    setIsAbandoned(false);
  }, [
    setHistory,
    seed,
    rules,
    setUndosUsed,
    setMoveCount,
    setMoves,
    setCursor,
    cursorRef,
    setCheckpoint,
    setEndedAtMs,
    setIsAbandoned,
    movesRef
  ]);

  const abandonIfNeededThenStart = useCallback(
    (startNext: () => void) => {
      // If a game is in progress, abandon it first so it gets archived.
      const isFinished = isWon || isAbandoned || endedAtMs != null;

      const start = () => {
        const deviceId = getOrCreateDeviceId();
        deleteInProgressGameForDevice(
          deviceId,
          "useGameActions abandonIfNeededThenStart"
        ).catch(() => {});
        startNext();
      };

      if (hasStarted && !isFinished) {
        const ended = Date.now();

        setIsAbandoned(true);
        setEndedAtMs((prev) => (prev == null ? ended : prev));

        const archivedCursor = cursorRef.current;
        const archivedMoves = movesRef.current;

        const completed: PersistedGame = {
          gameId,
          deviceId: getOrCreateDeviceId(),
          seed,
          rules: state.rules,
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
      state.rules,
      startedAtMs,
      timeElapsedMs,
      undosUsed,
      cursorRef,
      movesRef,
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
    setMoveCount((n) => Math.max(0, n - 1));
    setCursor((c) => {
      const next = Math.max(0, c - 1);
      cursorRef.current = next;
      movesRef.current = movesRef.current.slice(0, next);
      return next;
    });

    setHistory((h) => {
      if (h.past.length === 0) return h;
      const prev = h.past[h.past.length - 1];
      return {
        present: prev,
        past: h.past.slice(0, -1)
      };
    });
  }, [
    isWon,
    history.past.length,
    undoLimit,
    undosUsed,
    setUndosUsed,
    setMoveCount,
    setCursor,
    cursorRef,
    setHistory,
    movesRef
  ]);

  return { dispatchMove, restart, newDeal, startBySeed, undo };
}
