"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { applyMove, areAllCardsUnlocked, createGame } from "@vcell/engine";
import type { GameState, Move, Rules, UndoLimit } from "@vcell/engine";

// NOTE: We'll fully lock the engine contract later. For now we can still keep things
// flexible while staying type-safe by deriving types from the engine functions.

type GameContextValue = {
  state: GameState;
  isWon: boolean;
  dispatchMove: (move: Move) => void;
  restart: () => void;
  newDeal: () => void;
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
};

type HistoryState = {
  present: GameState;
  past: GameState[];
};

const SHOW_TIMER_KEY = "vcell:showTimer";
const UNDO_LIMIT_KEY = "vcell:undoLimit";

const GameContext = createContext<GameContextValue | null>(null);

// A persistable-ish snapshot of the current game state for debugging / DB modeling.
// Intentionally excludes `timeElapsedMs` from the LOG signature so timer ticks don't spam logs.

type GameSnapshot = {
  gameId: string; // currently we use `seed` as the runtime identifier
  seed: string;
  rules: GameState["rules"];
  hasStarted: boolean;
  isAbandoned: boolean;
  paused: boolean;
  canUndo: boolean;
  moveCount: number; // number of moves made in the current timeline (net of undos)
  undosUsed: number;
  timeElapsedMs: number;
  startedAtMs: number | null;
  endedAtMs: number | null;
  // Keep the full engine state in the snapshot so we can inspect it when debugging.
  // (If this gets too noisy later, we can log a smaller shape or a diff only.)
  state: GameState;
};

type LogSnapshot = Omit<GameSnapshot, "timeElapsedMs">;

function diffKeys(prev: LogSnapshot | null, next: LogSnapshot): string[] {
  if (!prev) return ["(initial)"];
  const changed: string[] = [];
  (Object.keys(next) as (keyof LogSnapshot)[]).forEach((k) => {
    // Cheap comparison: primitives by value; objects by reference.
    // This is fine for console visibility; not meant for deep-equality.
    if (prev[k] !== next[k]) changed.push(String(k));
  });
  return changed;
}

function undoLimitToCap(undoLimit: UndoLimit): number {
  if (undoLimit === "unlimited") return Number.POSITIVE_INFINITY;
  return undoLimit;
}

function makeNewSeed(): string {
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

  // ---------------------------------------------------------------------------
  // History / engine state
  // ---------------------------------------------------------------------------
  const [history, setHistory] = useState<HistoryState>(() => ({
    present: createGame(seed, rules),
    past: []
  }));
  const state = history.present;

  // ---------------------------------------------------------------------------
  // Run state (timer + pause)
  // ---------------------------------------------------------------------------
  const [timeElapsedMs, setTimeElapsedMs] = useState<number>(0);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [endedAtMs, setEndedAtMs] = useState<number | null>(null);
  const [isAbandoned, setIsAbandoned] = useState<boolean>(false);
  const [paused, setPaused] = useState<boolean>(false);

  // Timer refs
  const intervalIdRef = useRef<number | null>(null);
  const lastTickAtRef = useRef<number | null>(null);

  // ---------------------------------------------------------------------------
  // Undo analytics
  // ---------------------------------------------------------------------------
  const [undosUsed, setUndosUsed] = useState<number>(0);

  // Score-keeping move count: freezes once the game is won. (Cosmetic post-win moves are allowed.)
  const [moveCount, setMoveCount] = useState<number>(0);

  // ---------------------------------------------------------------------------
  // Client-only seed init (avoids hydration mismatches)
  // ---------------------------------------------------------------------------
  const didInitRandomSeedRef = useRef(false);

  useEffect(() => {
    if (didInitRandomSeedRef.current) return;
    didInitRandomSeedRef.current = true;

    const newSeed = makeNewSeed();
    setSeed(newSeed);

    // New session on mount.
    setHistory({ present: createGame(newSeed, rules), past: [] });
    setTimeElapsedMs(0);
    setHasStarted(false);
    setStartedAtMs(null);
    setEndedAtMs(null);
    setIsAbandoned(false);
    setUndosUsed(0);
    setMoveCount(0);
    setSeedReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    const newSeed = makeNewSeed();
    setSeed(newSeed);

    setHistory({ present: createGame(newSeed, rules), past: [] });
    setTimeElapsedMs(0);
    setHasStarted(false);
    setStartedAtMs(null);
    setEndedAtMs(null);
    setIsAbandoned(false);
    setUndosUsed(0);
    setMoveCount(0);
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

  // Stamp end time once when the game is finished (won or abandoned).
  useEffect(() => {
    const finished = isWon || isAbandoned;
    if (!finished) return;
    setEndedAtMs((prev) => (prev == null ? Date.now() : prev));
  }, [isWon, isAbandoned]);

  // ---------------------------------------------------------------------------
  // Timer loop
  // ---------------------------------------------------------------------------
  useEffect(() => {
    function clearTimerInterval() {
      if (intervalIdRef.current !== null) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      lastTickAtRef.current = null;
    }

    function startTimerInterval() {
      if (intervalIdRef.current !== null) return;
      lastTickAtRef.current = performance.now();
      intervalIdRef.current = window.setInterval(() => {
        const now = performance.now();
        const lastTickAt = lastTickAtRef.current;
        const deltaMs = lastTickAt == null ? 0 : now - lastTickAt;

        if (lastTickAt != null) {
          setTimeElapsedMs((prev) => prev + deltaMs);
        }

        lastTickAtRef.current = now;
      }, 250);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        clearTimerInterval();
      } else if (
        document.visibilityState === "visible" &&
        !paused &&
        !isFinished &&
        seedReady &&
        hasStarted
      ) {
        startTimerInterval();
      }
    }

    const isFinished = isWon || isAbandoned;

    if (
      !paused &&
      !isFinished &&
      seedReady &&
      hasStarted &&
      document.visibilityState === "visible"
    ) {
      startTimerInterval();
    }

    if (isFinished) {
      clearTimerInterval();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimerInterval();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [paused, seedReady, hasStarted, isWon, isAbandoned]);

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
    setEndedAtMs(null);
    setIsAbandoned(false);
  };

  const newDeal = () => {
    const newSeed = makeNewSeed();
    setSeed(newSeed);

    setHistory({ present: createGame(newSeed, rules), past: [] });
    setTimeElapsedMs(0);
    setHasStarted(false);
    setStartedAtMs(null);
    setEndedAtMs(null);
    setIsAbandoned(false);
    setUndosUsed(0);
    setMoveCount(0);
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
  const gameSnapshot = useMemo<GameSnapshot>(
    () => ({
      gameId: seed,
      seed,
      rules: state.rules,
      hasStarted,
      isAbandoned,
      paused,
      canUndo,
      moveCount,
      undosUsed,
      timeElapsedMs,
      startedAtMs,
      endedAtMs,
      state
    }),
    [
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
      endedAtMs
    ]
  );

  // Keep `timeElapsedMs` inside the snapshot, but exclude it from the LOG signature.
  const logSnapshot = useMemo<LogSnapshot>(
    () => ({
      gameId: seed,
      seed,
      rules: state.rules,
      hasStarted,
      isAbandoned,
      paused,
      canUndo,
      moveCount,
      undosUsed,
      startedAtMs,
      endedAtMs,
      state
    }),
    [
      seed,
      state,
      hasStarted,
      isAbandoned,
      paused,
      canUndo,
      moveCount,
      undosUsed,
      startedAtMs,
      endedAtMs
    ]
  );

  const gameSnapshotRef = useRef<GameSnapshot>(gameSnapshot);
  useEffect(() => {
    gameSnapshotRef.current = gameSnapshot;
  }, [gameSnapshot]);

  const prevLogSnapshotRef = useRef<LogSnapshot | null>(null);

  useEffect(() => {
    const prev = prevLogSnapshotRef.current;
    const changed = diffKeys(prev, logSnapshot);

    // Avoid noisy logs if somehow nothing changed.
    if (prev && changed.length === 0) return;

    const snap = gameSnapshotRef.current;

    console.groupCollapsed(
      `[Game] changed: ${changed.join(", ")} (seed=${snap.seed})`
    );
    console.log("changedKeys", changed);
    console.log("game", snap);
    console.groupEnd();

    prevLogSnapshotRef.current = logSnapshot;
  }, [logSnapshot]);

  // ---------------------------------------------------------------------------
  // Context value
  // ---------------------------------------------------------------------------
  const value: GameContextValue = {
    state,
    isWon,
    dispatchMove,
    restart,
    newDeal,
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
    moveCount
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
