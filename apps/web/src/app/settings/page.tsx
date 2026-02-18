"use client";

import { useTheme, type Theme } from "@/state/theme/ThemeProvider";
import { useGame } from "@/state/game/GameProvider";
import { useSession } from "@/state/session/SessionProvider";

export default function SettingsPage() {
  const { showTimer, setShowTimer } = useGame();
  const { theme, setTheme } = useTheme();

  const { isUser } = useSession();

  return (
    <main>
      <header>
        <h1>Settings</h1>
      </header>

      <section>
        <h2>Account</h2>
        {isUser ? (
          <p>DISPLAY NAME</p>
        ) : (
          <p className="hint">Log in to access account settings.</p>
        )}
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
