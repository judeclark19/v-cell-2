"use client";

import { useGame } from "@/state/game/GameProvider";
import Board from "./components/Board";

function DebugPanel() {
  const { state, restart } = useGame();
  console.log("Current game state:", state);

  return (
    <div style={{ fontFamily: "var(--font-geist-mono), monospace" }}>
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

export default function GamePage() {
  return (
    <>
      <Board />
      <DebugPanel />
    </>
  );
}
