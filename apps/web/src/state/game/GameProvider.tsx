"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { applyMove, createGame } from "@vcell/engine";

// NOTE: We'll fully lock the engine contract later. For now we can still keep things
// flexible while staying type-safe by deriving types from the engine functions.
type GameState = ReturnType<typeof createGame>;
type Move = Parameters<typeof applyMove>[1];

type GameContextValue = {
  state: GameState;
  dispatchMove: (move: Move) => void;
  restart: () => void;
};

const GameContext = createContext<GameContextValue | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within <GameProvider />");
  return ctx;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  // Keep seed stable for this session.
  const seed = useMemo(() => "dev-seed-001", []);

  // Minimal starter rules; we'll replace this with a typed Rules object soon.
  type Rules = Parameters<typeof createGame>[1];

  const rules = useMemo<Rules>(
    () => ({
      allowFoundationPullback: true,
      faceDownCount: 7,
      undoLimit: "unlimited"
    }),
    []
  );

  // Create the initial game exactly once.
  const [state, setState] = useState<GameState>(() => createGame(seed, rules));

  const dispatchMove = (move: Move) => {
    setState((prev: GameState) => applyMove(prev, move));
  };

  const restart = () => {
    setState(createGame(seed, rules));
  };

  const value: GameContextValue = { state, dispatchMove, restart };
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
