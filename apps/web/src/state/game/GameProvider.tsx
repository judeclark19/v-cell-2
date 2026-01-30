"use client";

import {
  createContext,
  useCallback,
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

function makeNewSeed(): string {
  return crypto.randomUUID();
}

function makeNewGameId(): string {
  return crypto.randomUUID();
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
  // Seed is initialized to a deterministic placeholder to avoid hydration mismatches.
  const [seed, setSeed] = useState<string>("seed-init");
  const [gameId, setGameId] = useState<string>("game-init");
  const [seedReady, setSeedReady] = useState<boolean>(false);

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

  type StartSessionMode =
    | { kind: "new" }
    | { kind: "seed"; seed: string }
    | { kind: "seed+id"; seed: string; gameId: string };

  const startSession = useCallback(
    (mode: StartSessionMode) => {
      const nextSeed = mode.kind === "new" ? makeNewSeed() : mode.seed;

      const nextGameId =
        mode.kind === "seed+id" ? mode.gameId : makeNewGameId();

      setSeed(nextSeed);
      setGameId(nextGameId);

      // New session.
      setHistory({ present: createGame(nextSeed, rules), past: [] });
      setTimeElapsedMs(0);
      setHasStarted(false);
      setStartedAtMs(null);
      setEndedAtMs(null);
      setIsAbandoned(false);
      setPendingNewDeal(false);
      setUndosUsed(0);
      setMoveCount(0);
      setMoves([]);
      setCursor(0);
      cursorRef.current = 0;
      setCheckpoint(null);
    },
    [rules]
  );

  // ---------------------------------------------------------------------------
  // History / engine state
  // ---------------------------------------------------------------------------
  const [history, setHistory] = useState<HistoryState>(() => ({
    present: createGame(seed, rules),
    past: []
  }));
  const state = history.present;

  // ---------------------------------------------------------------------------
  // Completed games archive (in-memory, Phase A)
  // ---------------------------------------------------------------------------
  const [completedGames, setCompletedGames] = useState<GameResult[]>([]);
  const [pendingNewDeal, setPendingNewDeal] = useState<boolean>(false);

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
  // Client-only seed init (avoids hydration mismatches)
  // ---------------------------------------------------------------------------
  const didInitRandomSeedRef = useRef(false);

  useEffect(() => {
    if (didInitRandomSeedRef.current) return;
    didInitRandomSeedRef.current = true;

    startSession({ kind: "new" });
    setSeedReady(true);
  }, [startSession]);

  // ---------------------------------------------------------------------------
  // Rule changes => start a NEW game (reseed)
  // ---------------------------------------------------------------------------
  const didApplyRulesEffectOnceRef = useRef(false);

  useEffect(() => {
    // Skip initial mount; otherwise we can clobber the client-only random seed init.
    if (!didApplyRulesEffectOnceRef.current) {
      didApplyRulesEffectOnceRef.current = true;
      return;
    }

    startSession({ kind: "new" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowFoundationPullback, undoLimit]);

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

  const startNewDealSession = useCallback(() => {
    startSession({ kind: "new" });
  }, [startSession]);

  // Stamp end time once when the game is finished (won or abandoned) and archive a result.
  useEffect(() => {
    const finished = isWon || isAbandoned;
    if (!finished) return;

    // Only finalize once per game.
    if (endedAtMs != null) return;

    const ended = Date.now();
    setEndedAtMs(ended);

    const status: GameResult["status"] = isWon ? "won" : "abandoned";

    setCompletedGames((prev) => {
      if (prev.some((g) => g.gameId === gameId)) return prev;
      return [
        ...prev,
        {
          gameId,
          seed,
          rules: state.rules,
          status,
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

    if (pendingNewDeal) {
      startNewDealSession();
    }
  }, [
    isWon,
    isAbandoned,
    endedAtMs,
    gameId,
    seed,
    state.rules,
    startedAtMs,
    timeElapsedMs,
    moveCount,
    undosUsed,
    moves,
    cursor,
    pendingNewDeal,
    startNewDealSession
  ]);

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
    setPendingNewDeal(false);
  };

  const newDeal = () => {
    // If a game is in progress, abandon it first so it gets archived.
    const isFinished = isWon || isAbandoned || endedAtMs != null;

    if (hasStarted && !isFinished) {
      setPendingNewDeal(true);
      setIsAbandoned(true);
      return;
    }

    // Otherwise just start immediately.
    startNewDealSession();
  };

  const replaySeed = useCallback(
    (nextSeed: string) => {
      startSession({ kind: "seed", seed: nextSeed });
    },
    [startSession]
  );
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
