"use client";

// Settings is intentionally a UI skeleton for now.
// We’re mapping the knobs we’ll need before wiring them to persistence or the engine.

import { useTheme, type Theme } from "@/state/theme/ThemeProvider";
import { useGame } from "@/state/game/GameProvider";
import { UndoLimit } from "@vcell/engine";

export default function SettingsPage() {
  const {
    showTimer,
    setShowTimer,
    allowFoundationPullback,
    setAllowFoundationPullback,
    undoLimit,
    setUndoLimit
  } = useGame();
  const { theme, setTheme } = useTheme();

  const parseUndoLimit = (value: string): UndoLimit => {
    if (value === "unlimited") return "unlimited";
    const n = Number(value);
    if (n === 0 || n === 1 || n === 3 || n === 5) return n as UndoLimit;
    return "unlimited";
  };

  return (
    <main>
      <header>
        <h1>Settings</h1>
        <p>
          This page is a scaffold: the controls below are placeholders so we can
          agree on what needs to exist. We’ll wire these to session/profile +
          engine rules next.
        </p>
      </header>

      <section>
        <h2>Gameplay</h2>
        <p className="hint" style={{ marginBottom: "1em" }}>
          Changing any gameplay setting starts a new game.
        </p>
        <div className="grid">
          <label className="field">
            Face-down cards at deal
            <select
              className="control"
              disabled
              defaultValue="7"
              id="face-down-cards"
            >
              <option value="0">0 (all face-up)</option>
              <option value="7">7 (classic)</option>
              <option value="14">14</option>
              <option value="21">21</option>
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

      <section>
        <h2>Appearance</h2>
        <div className="grid">
          <label className="field">
            Theme
            <select
              className="control"
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
            >
              <option value="poker">Poker</option>
              <option value="times-light">Times Light</option>
              <option value="times-dark">Times Dark</option>
            </select>
            <small className="hint">
              Saved locally. If you haven’t chosen a theme yet, OS dark mode
              defaults to Times Dark.
            </small>
          </label>

          <label className="field">
            Show timer
            <select
              className="control"
              id="show-timer"
              value={showTimer ? "true" : "false"}
              onChange={(e) => setShowTimer(e.target.value === "true")}
            >
              <option value="true">Show</option>
              <option value="false">Hide</option>
            </select>
          </label>
        </div>
      </section>
    </main>
  );
}
