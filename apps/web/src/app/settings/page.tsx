"use client";

import { Panel } from "@vcell/ui";
import { useTheme, type Theme } from "@/state/theme/ThemeProvider";
import { useSession } from "@/state/auth/AuthProvider";
import AccountSettings from "@/ui/AccountSettings";
import { useDispatch, useSelector } from "react-redux";
import {
  selectMotionPreference,
  selectShowTimer,
  setMotionPreference,
  setShowTimer
} from "@/state/ui/uiSlice";
import { AppDispatch } from "@/state/reduxStore";
import { useIsOffline } from "@/state/network/useIsOffline";
import type { MotionPreference } from "@/state/ui/motionPreference";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { isUser } = useSession();

  const showTimer = useSelector(selectShowTimer);
  const motionPreference = useSelector(selectMotionPreference);
  const dispatch = useDispatch<AppDispatch>();
  const isOffline = useIsOffline();

  return (
    <main>
      <header>
        <h1 style={{ textAlign: "center" }}>Settings</h1>
      </header>

      <Panel
        as="section"
        padding="lg"
        aria-label="Account settings"
        style={{ margin: "0 auto 2rem" }}
      >
        <h2>Account</h2>

        {isOffline ? (
          <p className="hint">
            Cloud sync is unavailable right now. Account settings are
            unavailable until the connection recovers.
          </p>
        ) : isUser ? (
          <AccountSettings />
        ) : (
          <p className="hint">Log in to access account settings.</p>
        )}
      </Panel>

      <Panel
        as="section"
        padding="lg"
        aria-label="Appearance settings"
        style={{ margin: "0 auto" }}
      >
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

          <label className="field">
            Reduce motion
            <select
              className="control"
              id="reduce-motion"
              value={motionPreference}
              onChange={(e) =>
                dispatch(
                  setMotionPreference(e.target.value as MotionPreference)
                )
              }
            >
              <option value="system">System default</option>
              <option value="reduce">Reduce motion</option>
              <option value="full">Full motion</option>
            </select>
            <small className="hint">
              System default follows your OS reduced-motion setting.
            </small>
          </label>
        </div>
      </Panel>
    </main>
  );
}
