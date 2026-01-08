"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
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
  // Session-only seed counter. Refresh resets back to 100.
  const [seedNumber, setSeedNumber] = useState<number>(100);

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

  // Create the initial game exactly once.
  const [history, setHistory] = useState<HistoryState>(() => ({
    present: createGame(seed, rules),
    past: []
  }));

  const state = history.present;

  useEffect(() => {
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

  const dispatchMove = (move: Move) => {
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
    setAllowFoundationPullback
  };
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
