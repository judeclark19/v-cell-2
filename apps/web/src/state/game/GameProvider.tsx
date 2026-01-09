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

// NOTE: We'll fully lock the engine contract later. For now we can still keep things
// flexible while staying type-safe by deriving types from the engine functions.
type GameState = ReturnType<typeof createGame>;
type Move = Parameters<typeof applyMove>[1];

type GameContextValue = {
  state: GameState;
  isWon: boolean;
  dispatchMove: (move: Move) => void;
  restart: () => void;
  newDeal: () => void;
  undo: () => void;
  canUndo: boolean;
  showTimer: boolean;
  setShowTimer: (next: boolean) => void;
  paused: boolean;
  setPaused: (next: boolean) => void;
  allowFoundationPullback: boolean;
  setAllowFoundationPullback: (next: boolean) => void;
  seedReady: boolean;
  timeElapsedMs: number;
  hasStarted: boolean;
};

const SHOW_TIMER_KEY = "vcell:showTimer";

const GameContext = createContext<GameContextValue | null>(null);

type HistoryState = {
  present: GameState;
  past: GameState[];
};

function undoLimitToCap(undoLimit: GameState["rules"]["undoLimit"]): number {
  if (undoLimit === "unlimited") return Number.POSITIVE_INFINITY;
  return undoLimit;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within <GameProvider />");
  return ctx;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  // Session-only seed counter.
  // IMPORTANT: keep the initial value deterministic to avoid Next.js hydration mismatches.
  // We'll randomize on the client *after mount*.
  const [seedNumber, setSeedNumber] = useState<number>(1);
  const [seedReady, setSeedReady] = useState<boolean>(false);

  const seed = useMemo(() => {
    const padded = String(seedNumber).padStart(3, "0");
    return `dev-seed-${padded}`;
  }, [seedNumber]);

  // Minimal starter rules; we'll replace this with a typed Rules object soon.
  type Rules = Parameters<typeof createGame>[1];

  const [allowFoundationPullback, setAllowFoundationPullback] =
    useState<boolean>(true);

  const rules = useMemo<Rules>(
    () => ({
      allowFoundationPullback,
      faceDownCount: 7,
      undoLimit: "unlimited"
    }),
    [allowFoundationPullback]
  );

  const didInitRandomSeedRef = useRef(false);

  // New timer state and refs
  const [timeElapsedMs, setTimeElapsedMs] = useState<number>(0);
  const lastTickAtRef = useRef<number | null>(null);
  const intervalIdRef = useRef<number | null>(null);
  const lastCallbackAtRef = useRef<number | null>(null);
  const [hasStarted, setHasStarted] = useState<boolean>(false);

  useEffect(() => {
    // Choose a random starting seed on the client after mount.
    // This avoids hydration mismatches while still giving variety per refresh.
    if (didInitRandomSeedRef.current) return;
    didInitRandomSeedRef.current = true;

    const n = Math.floor(Math.random() * 800) + 1;
    setSeedNumber(n);

    const padded = String(n).padStart(3, "0");
    const nextSeed = `dev-seed-${padded}`;
    setHistory({ present: createGame(nextSeed, rules), past: [] });
    setTimeElapsedMs(0);
    setHasStarted(false);
    setSeedReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create the initial game exactly once.
  const [history, setHistory] = useState<HistoryState>(() => ({
    present: createGame(seed, rules),
    past: []
  }));
  const state = history.present;

  const didApplyRulesEffectOnceRef = useRef(false);

  useEffect(() => {
    // Skip the initial mount; otherwise we clobber the client-only random seed init
    // and reset back to dev-seed-001.
    if (!didApplyRulesEffectOnceRef.current) {
      didApplyRulesEffectOnceRef.current = true;
      return;
    }

    // Apply the updated rules immediately by restarting the current deal.
    // Keeps the current seed (dev-seed-XYZ) but resets move history.
    setHistory({ present: createGame(seed, rules), past: [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowFoundationPullback]);

  const isWon = useMemo(() => areAllCardsUnlocked(state), [state]);

  const [showTimer, setShowTimer] = useState<boolean>(() => {
    if (typeof window === "undefined") return true; // default
    const raw = window.localStorage.getItem(SHOW_TIMER_KEY);
    if (raw == null) return true;
    return raw === "true";
  });

  const [paused, setPaused] = useState<boolean>(false);

  useEffect(() => {
    window.localStorage.setItem(SHOW_TIMER_KEY, String(showTimer));
  }, [showTimer]);

  // Timer effect
  useEffect(() => {
    function clearTimerInterval() {
      if (intervalIdRef.current !== null) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      lastTickAtRef.current = null;
      lastCallbackAtRef.current = null;
    }

    function startTimerInterval() {
      if (intervalIdRef.current !== null) return;
      lastTickAtRef.current = performance.now();
      intervalIdRef.current = window.setInterval(() => {
        const now = performance.now();

        // Delta since the last tick (used for accumulation)
        const lastTickAt = lastTickAtRef.current;
        const deltaMs = lastTickAt == null ? 0 : now - lastTickAt;

        // Cadence between *callbacks* (helps diagnose interval jitter / throttling)
        lastCallbackAtRef.current = now;

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
        seedReady &&
        hasStarted
      ) {
        startTimerInterval();
      }
    }

    if (
      !paused &&
      seedReady &&
      hasStarted &&
      document.visibilityState === "visible"
    ) {
      startTimerInterval();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimerInterval();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [paused, seedReady, hasStarted]);

  const dispatchMove = (move: Move) => {
    setHasStarted(true);
    setHistory((h) => {
      const next = applyMove(h.present, move);

      const cap = undoLimitToCap(next.rules.undoLimit);
      const nextPast = [...h.past, h.present];

      if (Number.isFinite(cap) && nextPast.length > cap) {
        // Keep the most recent `cap` states
        nextPast.splice(0, nextPast.length - cap);
      }

      return {
        present: next,
        past: nextPast
      };
    });
  };

  const restart = () => {
    setHistory({ present: createGame(seed, rules), past: [] });
  };

  const newDeal = () => {
    setSeedNumber((n) => {
      const next = n + 1;
      const padded = String(next).padStart(3, "0");
      const nextSeed = `dev-seed-${padded}`;
      setHistory({ present: createGame(nextSeed, rules), past: [] });
      setTimeElapsedMs(0);
      setHasStarted(false);
      return next;
    });
  };

  const undo = () => {
    setHistory((h) => {
      if (h.past.length === 0) return h;
      const prev = h.past[h.past.length - 1];
      return {
        present: prev,
        past: h.past.slice(0, -1)
      };
    });
  };

  const canUndo = history.past.length > 0;

  const value: GameContextValue = {
    state,
    isWon,
    dispatchMove,
    restart,
    newDeal,
    undo,
    canUndo,
    showTimer,
    setShowTimer,
    paused,
    setPaused,
    allowFoundationPullback,
    setAllowFoundationPullback,
    seedReady,
    timeElapsedMs,
    hasStarted
  };
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
