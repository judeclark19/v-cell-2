"use client";

import { useTheme, type Theme } from "@/state/theme/ThemeProvider";
import { useSession } from "@/state/session/SessionProvider";
import AccountSettings from "@/ui/AccountSettings";
import { useDispatch, useSelector } from "react-redux";
import { selectShowTimer, setShowTimer } from "@/state/ui/uiSlice";
import { AppDispatch } from "@/state/reduxStore";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { isUser } = useSession();

  const showTimer = useSelector(selectShowTimer);
  const dispatch = useDispatch<AppDispatch>();

  return (
    <main>
      <header>
        <h1>Settings</h1>
      </header>

      <section>
        <h2>Account</h2>
        {isUser ? (
          <AccountSettings />
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
              onChange={(e) =>
                dispatch(setShowTimer(e.target.value === "true"))
              }
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
