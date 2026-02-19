import { useState } from "react";
import { useGame } from "@/state/game/GameProvider";
import { UndoLimit } from "@vcell/engine";
import SeedButton from "@/ui/SeedButton";

type BoardControlsProps = {
  seed: string;
  onNewDeal: () => void;
  onRestart: () => void;
  onUndo: () => void;
  canUndo: boolean;
  undosRemaining: number;
  startBySeed: (seed: string) => void;
};

const parseFaceDownCount = (value: string): 0 | 7 | 14 | 21 => {
  const n = Number(value);
  if (n === 0 || n === 7 || n === 14 || n === 21) return n;
  return 7;
};

const parseUndoLimit = (value: string): UndoLimit => {
  if (value === "unlimited") return "unlimited";
  const n = Number(value);
  if (n === 0 || n === 1 || n === 3 || n === 5) return n as UndoLimit;
  return "unlimited";
};

export default function BoardControls({
  seed,
  onNewDeal,
  onRestart,
  onUndo,
  canUndo,
  undosRemaining,
  startBySeed
}: BoardControlsProps) {
  const {
    allowFoundationPullback,
    setAllowFoundationPullback,
    undoLimit,
    setUndoLimit,
    faceDownCount,
    setFaceDownCount
  } = useGame();
  console.log("BoardControls render", { seed, undoLimit, faceDownCount });

  const [seedInput, setSeedInput] = useState("");

  return (
    <>
      <section className="control" aria-label="This game">
        <h2>This game</h2>
        <div className="row">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onUndo}
            disabled={!canUndo}
          >
            {undoLimit === "unlimited" || undoLimit === 0
              ? "Undo"
              : `Undo (${undosRemaining})`}
          </button>

          <button
            type="button"
            className="btn btn--secondary"
            onClick={onRestart}
          >
            Restart deal
          </button>
        </div>

        <p className="hint" style={{ textAlign: "center" }}>
          Current seed: {seed ? <SeedButton seed={seed} /> : "(unknown)"}
        </p>
      </section>

      <section className="control" aria-label="Start a new game">
        <h2>Start a new game</h2>
        <p className="hint" style={{ marginBottom: "1em" }}>
          Starting a new game abandons the current one.
        </p>

        <div className="row">
          <button
            type="button"
            className="btn btn--primary"
            onClick={onNewDeal}
          >
            New deal
          </button>
        </div>

        <label className="field" style={{ marginTop: "1em" }}>
          Play a specific seed
          <div className="row">
            <input
              className="control"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="Enter seed…"
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              aria-label="Seed"
              name="seed-input"
              id="seed-input"
            />
            <button
              type="button"
              className="btn btn--secondary"
              disabled={!seedInput.trim()}
              onClick={() => {
                startBySeed(seedInput);
                setSeedInput("");
              }}
            >
              Play seed
            </button>
          </div>
          <small className="hint">
            Start a new game from the provided seed.
          </small>
        </label>
      </section>
      <section className="control">
        <h2>Gameplay</h2>
        <p className="hint" style={{ marginBottom: "1em" }}>
          Changing any gameplay setting starts a new game.
        </p>
        <div className="grid">
          <label className="field">
            Face-down cards at deal
            <select
              className="control"
              id="face-down-cards"
              value={String(faceDownCount)}
              onChange={(e) =>
                setFaceDownCount(parseFaceDownCount(e.target.value))
              }
            >
              <option value="0">0 (all face-up)</option>
              <option value="7">7 (classic)</option>
              <option value="14">14 (2 rows)</option>
              <option value="21">21 (3 rows)</option>
            </select>
            <small className="hint">
              Engine rule: V-shape layering. Auto-flip when a face-down card
              becomes exposed.
            </small>
          </label>

          <label className="field">
            Undo limit
            <select
              className="control"
              id="undo-limit"
              value={String(undoLimit)}
              onChange={(e) => setUndoLimit(parseUndoLimit(e.target.value))}
            >
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="3">3</option>
              <option value="5">5</option>
              <option value="unlimited">Unlimited</option>
            </select>
            <small className="hint">
              For MVP we can enforce in UI; later we can also record undos used
              for stats.
            </small>
          </label>

          <label className="field">
            Foundation pullback
            <select
              className="control"
              id="foundation-pullback"
              value={allowFoundationPullback ? "on" : "off"}
              onChange={(e) =>
                setAllowFoundationPullback(e.target.value === "on")
              }
            >
              <option value="on">On (easier)</option>
              <option value="off">Off (harder)</option>
            </select>
            <small className="hint">
              When enabled, top foundation card can move to tableau/freecell.
            </small>
          </label>
        </div>
      </section>
    </>
  );
}
