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
import { createGame } from "@vcell/engine";
import type { GameState, Move, Rules, UndoLimit } from "@vcell/engine";
import { useGameSession } from "./hooks/useGameSession";
import { useGameActions } from "./hooks/useGameActions";
import { useGameSettings } from "./hooks/useGameSettings";
import { useGameDerivedState } from "./hooks/useGameDerivedState";
import {
  getAllCompletedGames,
  upsertCompletedGame
} from "../../persistence/completedGamesStore";
import {
  getInProgressGame,
  upsertInProgressGame,
  deleteInProgressGame
} from "../../persistence/inProgressGamesStore";

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
  faceDownCount: Rules["faceDownCount"];
  setFaceDownCount: (next: Rules["faceDownCount"]) => void;
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

export type HistoryState = {
  present: GameState;
  past: GameState[];
};

const GameContext = createContext<GameContextValue | null>(null);

export type GameResult = {
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
  const {
    showTimer,
    setShowTimer,
    undoLimit,
    setUndoLimit,
    faceDownCount,
    setFaceDownCount
  } = useGameSettings();

  const rules = useMemo<Rules>(
    () => ({
      allowFoundationPullback,
      faceDownCount,
      undoLimit
    }),
    [allowFoundationPullback, faceDownCount, undoLimit]
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
  const completedGamesHydratedRef = useRef<boolean>(false);
  const persistedCompletedGameIdsRef = useRef<Set<string>>(new Set());

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
      faceDownCount,
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
  // Persistence: hydrate completed games (IndexedDB)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const persisted = await getAllCompletedGames();
        if (cancelled) return;

        // Hydrate once per provider lifetime.
        completedGamesHydratedRef.current = true;
        persistedCompletedGameIdsRef.current = new Set(
          persisted.map((g) => g.gameId)
        );

        setCompletedGames(persisted);
      } catch (err) {
        // If IndexedDB is unavailable (private mode / blocked), continue with in-memory only.
        completedGamesHydratedRef.current = true;

        console.error("Failed to hydrate completed games from IndexedDB", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Persistence: append newly completed games (IndexedDB)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Don’t persist until after initial hydration attempt finishes.
    if (!completedGamesHydratedRef.current) return;

    const persistedIds = persistedCompletedGameIdsRef.current;
    const pending = completedGames.filter((g) => !persistedIds.has(g.gameId));
    if (pending.length === 0) return;

    (async () => {
      for (const g of pending) {
        try {
          await upsertCompletedGame(g);
          persistedIds.add(g.gameId);
        } catch {
          // Ignore write failures; game still exists in-memory.
        }
      }
    })();
  }, [completedGames]);

  // ---------------------------------------------------------------------------
  // Persistence for in-progress games (IndexedDB)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    if (!seedReady) return;
    inProgressHydratedRef.current = false;

    (async () => {
      try {
        const saved = await getInProgressGame(gameId);
        if (cancelled) return;
        inProgressHydratedRef.current = true;
        if (!saved) return;

        // Restore snapshot + meta
        setHistory(saved.history);
        setTimeElapsedMs(saved.timeElapsedMs);
        setHasStarted(saved.hasStarted);
        setStartedAtMs(saved.startedAtMs);
        setEndedAtMs(saved.endedAtMs);
        setIsAbandoned(saved.isAbandoned);
        setPaused(saved.paused);
        setMoveCount(saved.moveCount);
        setUndosUsed(saved.undosUsed);

        // Optional: restore move log/cursor if you also persist it later
        // setMoves(saved.moves); setCursor(saved.cursor);
      } catch (err) {
        inProgressHydratedRef.current = true;
        console.error("Failed to hydrate in-progress game", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [seedReady, gameId]);

  const persistTimerRef = useRef<number | null>(null);
  const inProgressHydratedRef = useRef<boolean>(false);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const { isWon, undosRemaining, canUndo } = useGameDerivedState({
    state,
    pastLength: history.past.length,
    undoLimit,
    undosUsed
  });

  useEffect(() => {
    if (!seedReady) return;
    if (!inProgressHydratedRef.current) return;

    if (isWon || isAbandoned) {
      // If it ever becomes completed/abandoned, don't keep an in-progress snapshot around.
      deleteInProgressGame(gameId).catch(() => {});
      return;
    }

    // Only treat a game as “in progress” after the first move.
    if (!hasStarted) {
      // If we have a pristine deal (e.g., just refreshed / just dealt), ensure no record exists.
      deleteInProgressGame(gameId).catch(() => {});
      return;
    }

    // Throttle writes (otherwise you’ll write on every render/move burst).
    if (persistTimerRef.current != null) {
      window.clearTimeout(persistTimerRef.current);
    }

    persistTimerRef.current = window.setTimeout(() => {
      persistTimerRef.current = null;

      upsertInProgressGame({
        gameId,
        seed,
        rules,
        kind: "freeplay",
        history,
        timeElapsedMs,
        hasStarted,
        startedAtMs,
        endedAtMs,
        isAbandoned,
        paused,
        moveCount,
        undosUsed,
        updatedAtMs: Date.now()
      }).catch(() => {
        // ignore; user can still play in-memory
      });
    }, 300);

    return () => {
      if (persistTimerRef.current != null) {
        window.clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
    };
  }, [
    seedReady,
    gameId,
    seed,
    rules,
    history,
    timeElapsedMs,
    hasStarted,
    startedAtMs,
    endedAtMs,
    isAbandoned,
    paused,
    moveCount,
    undosUsed,
    isWon
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
    faceDownCount,
    setFaceDownCount,
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
