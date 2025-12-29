"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
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

function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within <GameProvider />");
  return ctx;
}

function GameProvider({ children }: { children: React.ReactNode }) {
  // Keep seed stable for this session.
  const seed = useMemo(() => "dev-seed-001", []);

  // Minimal starter rules; we'll replace this with a typed Rules object soon.
  const rules = useMemo(
    () =>
      ({
        allowFoundationPullback: true,
        faceDownCount: 7
      } as any),
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

function DebugPanel() {
  const { state, restart } = useGame();
  console.log("Current game state:", state);

  return (
    <div
      style={{ padding: 16, fontFamily: "var(--font-geist-mono), monospace" }}
    >
      <h1 style={{ marginBottom: 8 }}>V-Cell V2 (web) — Engine wiring ✅</h1>
      <p style={{ marginBottom: 12 }}>
        Seed: <strong>{state?.seed ?? "(unknown)"}</strong>
      </p>

      <button onClick={restart} style={{ padding: "8px 12px" }}>
        Restart seed
      </button>

      <pre
        style={{
          marginTop: 12,
          padding: 12,
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 8,
          overflow: "auto",
          maxHeight: 360
        }}
      >
        {JSON.stringify(state, null, 2)}
      </pre>
    </div>
  );
}

export default function Home() {
  return (
    <GameProvider>
      <DebugPanel />
    </GameProvider>
  );
}
