"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useGameTimer } from "./hooks/useGameTimer";
import { useGameSnapshotLogger } from "./hooks/useGameSnapshotLogger";
import { applyMove, areAllCardsUnlocked, createGame } from "@vcell/engine";
import type { GameState, Move, Rules, UndoLimit } from "@vcell/engine";
import { useGameSession } from "./hooks/useGameSession";

type GameContextValue = {
  state: GameState;
  isWon: boolean;
  dispatchMove: (move: Move) => void;
  restart: () => void;
  newDeal: () => void;
  replaySeed: (seed: string) => void;
  undo: () => void;
  canUndo: boolean;
  undoLimit: UndoLimit;
  setUndoLimit: (next: UndoLimit) => void;
  undosRemaining: number; // Infinity when unlimited
  showTimer: boolean;
  setShowTimer: (next: boolean) => void;
  paused: boolean;
  setPaused: (next: boolean) => void;
  allowFoundationPullback: boolean;
  setAllowFoundationPullback: (next: boolean) => void;
  seedReady: boolean;
  timeElapsedMs: number;
  startedAtMs: number | null;
  endedAtMs: number | null;
  hasStarted: boolean;
  isAbandoned: boolean;
  setIsAbandoned: (next: boolean) => void;
  moveCount: number;
  gameId: string;
  completedGames: GameResult[];
};

type HistoryState = {
  present: GameState;
  past: GameState[];
};

const SHOW_TIMER_KEY = "vcell:showTimer";
const UNDO_LIMIT_KEY = "vcell:undoLimit";

const GameContext = createContext<GameContextValue | null>(null);

type GameResult = {
  gameId: string;
  seed: string;
  rules: GameState["rules"];
  status: "won" | "abandoned";
  startedAtMs: number | null;
  endedAtMs: number;
  timeElapsedMs: number;
  moveCount: number;
  undosUsed: number;
  // Keep the move log so we can replay/debug later; can be trimmed when we persist.
  moves: Move[];
  cursor: number;
};

function undoLimitToCap(undoLimit: UndoLimit): number {
  if (undoLimit === "unlimited") return Number.POSITIVE_INFINITY;
  return undoLimit;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within <GameProvider />");
  return ctx;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  // ---------------------------------------------------------------------------
  // Seed + rules
  // ---------------------------------------------------------------------------
  // Seed and gameId state are now owned by useGameSession.

  const [allowFoundationPullback, setAllowFoundationPullback] =
    useState<boolean>(true);

  // ---------------------------------------------------------------------------
  // UI settings (localStorage)
  // ---------------------------------------------------------------------------
  const [showTimer, setShowTimer] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const raw = window.localStorage.getItem(SHOW_TIMER_KEY);
    if (raw == null) return true;
    return raw === "true";
  });

  const [undoLimit, setUndoLimit] = useState<UndoLimit>(() => {
    // SSR-safe default to avoid hydration mismatch.
    if (typeof window === "undefined") return "unlimited";
    const raw = window.localStorage.getItem(UNDO_LIMIT_KEY);
    if (raw == null) return "unlimited";
    if (raw === "unlimited") return "unlimited";
    const n = Number(raw);
    if (n === 0 || n === 1 || n === 3 || n === 5) return n as UndoLimit;
    return "unlimited";
  });

  useEffect(() => {
    window.localStorage.setItem(SHOW_TIMER_KEY, String(showTimer));
  }, [showTimer]);

  useEffect(() => {
    window.localStorage.setItem(UNDO_LIMIT_KEY, String(undoLimit));
  }, [undoLimit]);

  const rules = useMemo<Rules>(
    () => ({
      allowFoundationPullback,
      faceDownCount: 7,
      undoLimit
    }),
    [allowFoundationPullback, undoLimit]
  );

  const [checkpoint, setCheckpoint] = useState<{
    at: number;
    state: GameState;
  } | null>(null);

  // ---------------------------------------------------------------------------
  // History / engine state
  // ---------------------------------------------------------------------------
  const [history, setHistory] = useState<HistoryState>(() => ({
    present: createGame("seed-init", rules),
    past: []
  }));
  const state = history.present;

  // ---------------------------------------------------------------------------
  // Completed games archive (in-memory, Phase A)
  // ---------------------------------------------------------------------------
  const [completedGames, setCompletedGames] = useState<GameResult[]>([]);

  // ---------------------------------------------------------------------------
  // Run state (timer + pause)
  // ---------------------------------------------------------------------------
  const [timeElapsedMs, setTimeElapsedMs] = useState<number>(0);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [endedAtMs, setEndedAtMs] = useState<number | null>(null);
  const [isAbandoned, setIsAbandoned] = useState<boolean>(false);
  const [paused, setPaused] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // Undo analytics
  // ---------------------------------------------------------------------------
  const [undosUsed, setUndosUsed] = useState<number>(0);

  // Score-keeping move count: freezes once the game is won. (Cosmetic post-win moves are allowed.)
  const [moveCount, setMoveCount] = useState<number>(0);
  const [moves, setMoves] = useState<Move[]>([]);
  const [cursor, setCursor] = useState<number>(0);

  const cursorRef = useRef<number>(0);
  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  // ---------------------------------------------------------------------------
  // Session (seed/gameId/seedReady + init/reseed choreography)
  // ---------------------------------------------------------------------------
  const { seed, gameId, seedReady, startNewDealSession, replaySeed } =
    useGameSession({
      rules,
      allowFoundationPullback,
      undoLimit,
      setHistory,
      setTimeElapsedMs,
      setHasStarted,
      setStartedAtMs,
      setEndedAtMs,
      setIsAbandoned,
      setUndosUsed,
      setMoveCount,
      setMoves,
      setCursor,
      cursorRef,
      setCheckpoint
    });

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const isWon = useMemo(() => areAllCardsUnlocked(state), [state]);

  const undosRemaining = useMemo(() => {
    if (undoLimit === "unlimited") return Number.POSITIVE_INFINITY;
    return Math.max(0, undoLimit - undosUsed);
  }, [undoLimit, undosUsed]);

  const canUndo =
    !isWon &&
    history.past.length > 0 &&
    (undoLimit === "unlimited" || undosRemaining > 0);

  // ---------------------------------------------------------------------------
  // Timer loop
  // ---------------------------------------------------------------------------
  useGameTimer({
    paused,
    seedReady,
    hasStarted,
    isWon,
    isAbandoned,
    setTimeElapsedMs
  });

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const dispatchMove = (move: Move) => {
    // First move starts the timer clock.
    setHasStarted(true);
    setStartedAtMs((prev) => (prev == null ? Date.now() : prev));

    // If the game isn't finished yet, a move means we're actively playing (not abandoned).
    // Post-win cosmetic moves should NOT clear `endedAtMs`.
    if (!isWon) {
      setEndedAtMs(null);
      setIsAbandoned(false);
    }

    // Score-keeping: only count moves up to the win.
    if (!isWon) {
      setMoveCount((n) => n + 1);
      const baseCursor = cursorRef.current;

      setMoves((prev) => {
        const truncated = prev.slice(0, baseCursor);
        return [...truncated, move];
      });

      const nextCursor = baseCursor + 1;
      cursorRef.current = nextCursor;
      setCursor(nextCursor);
    }

    setHistory((h) => {
      const next = applyMove(h.present, move);

      // If this move produces a win, stamp `endedAtMs` exactly once.
      if (!isWon && areAllCardsUnlocked(next)) {
        const ended = Date.now();
        setEndedAtMs((prev) => (prev == null ? ended : prev));

        setCompletedGames((prev) => {
          if (prev.some((g) => g.gameId === gameId)) return prev;
          return [
            ...prev,
            {
              gameId,
              seed,
              rules: next.rules, // or state.rules if you prefer; next is fine here
              status: "won",
              startedAtMs,
              endedAtMs: ended,
              timeElapsedMs,
              moveCount,
              undosUsed,
              moves,
              cursor
            }
          ];
        });
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
  };

  // Restart should reset the deal back to its original position and clear history,
  // but it should NOT affect the timer.
  const restart = () => {
    setHistory({ present: createGame(seed, rules), past: [] });
    setUndosUsed(0);
    setMoveCount(0);
    setMoves([]);
    setCursor(0);
    cursorRef.current = 0;
    setCheckpoint(null);
    setEndedAtMs(null);
    setIsAbandoned(false);
  };

  const newDeal = () => {
    // If a game is in progress, abandon it first so it gets archived.
    const isFinished = isWon || isAbandoned || endedAtMs != null;

    if (hasStarted && !isFinished) {
      const ended = Date.now();

      setIsAbandoned(true);
      setEndedAtMs((prev) => (prev == null ? ended : prev));

      setCompletedGames((prev) => {
        if (prev.some((g) => g.gameId === gameId)) return prev;
        return [
          ...prev,
          {
            gameId,
            seed,
            rules: state.rules,
            status: "abandoned",
            startedAtMs,
            endedAtMs: ended,
            timeElapsedMs,
            moveCount,
            undosUsed,
            moves,
            cursor
          }
        ];
      });

      // Now actually start the new deal immediately.
      startNewDealSession();
      return;
    }

    // Otherwise just start immediately.
    startNewDealSession();
  };

  const undo = () => {
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
  };

  // ---------------------------------------------------------------------------
  // Snapshot logging
  // ---------------------------------------------------------------------------
  useGameSnapshotLogger({
    gameId,
    seed,
    state,
    hasStarted,
    isAbandoned,
    paused,
    canUndo,
    moveCount,
    undosUsed,
    timeElapsedMs,
    startedAtMs,
    endedAtMs,
    moves,
    cursor,
    checkpoint
  });

  // ---------------------------------------------------------------------------
  // Context value
  // ---------------------------------------------------------------------------
  const value: GameContextValue = {
    state,
    isWon,
    dispatchMove,
    restart,
    newDeal,
    replaySeed,
    undo,
    canUndo,
    undoLimit,
    setUndoLimit,
    undosRemaining,
    showTimer,
    setShowTimer,
    paused,
    setPaused,
    allowFoundationPullback,
    setAllowFoundationPullback,
    seedReady,
    timeElapsedMs,
    startedAtMs,
    endedAtMs,
    hasStarted,
    isAbandoned,
    setIsAbandoned,
    moveCount,
    gameId,
    completedGames
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
