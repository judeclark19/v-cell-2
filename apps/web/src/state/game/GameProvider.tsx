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
import {  areAllCardsUnlocked, createGame } from "@vcell/engine";
import type { GameState, Move, Rules, UndoLimit } from "@vcell/engine";
import { useGameSession } from "./hooks/useGameSession";
import { useGameActions } from "./hooks/useGameActions";

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
  const { dispatchMove, restart, newDeal, undo } = useGameActions({
    state,
    history,
    setHistory,

    seed,
    gameId,
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
    moveCount,
    setMoveCount,

    moves,
    setMoves,
    cursor,
    setCursor,
    cursorRef,

    setCheckpoint,

    setCompletedGames,

    timeElapsedMs,
    startedAtMs,

    startNewDealSession
  });

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
