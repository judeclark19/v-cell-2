"use client";

import { Field, Select } from "@vcell/ui";
import Link from "next/link";
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
import {
  SettingsFields,
  SettingsHeader,
  SettingsHint,
  SettingsPanel,
  SettingsPanels
} from "./page.styles";
import { SettingsRouteLoading } from "./skeleton";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { isUser } = useSession();

  const showTimer = useSelector(selectShowTimer);
  const motionPreference = useSelector(selectMotionPreference);
  const dispatch = useDispatch<AppDispatch>();
  const isOffline = useIsOffline();

  return <SettingsRouteLoading />;

  return (
    <main>
      <SettingsHeader>
        <h1>Settings</h1>
      </SettingsHeader>
      <SettingsPanels>
        <SettingsPanel as="section" padding="lg" aria-label="Account settings">
          <h2>Account</h2>

          {isOffline ? (
            <SettingsHint>
              Cloud sync is unavailable right now. Account settings are
              unavailable until the connection recovers.
            </SettingsHint>
          ) : isUser ? (
            <AccountSettings />
          ) : (
            <SettingsHint>
              <Link
                href="/login"
                style={{
                  textDecoration: "underline"
                }}
              >
                Log in
              </Link>{" "}
              to access account settings.
            </SettingsHint>
          )}
        </SettingsPanel>

        <SettingsPanel
          as="section"
          padding="lg"
          aria-label="Appearance settings"
        >
          <h2>Appearance</h2>
          <SettingsFields>
            <Field
              label="Theme"
              hint="Saved locally. If you haven’t chosen a theme yet, OS dark mode defaults to Times Dark."
            >
              <Select
                value={theme}
                onChange={(e) => setTheme(e.target.value as Theme)}
              >
                <option value="poker">Poker</option>
                <option value="times-light">Times Light</option>
                <option value="times-dark">Times Dark</option>
              </Select>
            </Field>

            <Field label="Show timer">
              <Select
                id="show-timer"
                value={showTimer ? "true" : "false"}
                onChange={(e) =>
                  dispatch(setShowTimer(e.target.value === "true"))
                }
              >
                <option value="true">Show</option>
                <option value="false">Hide</option>
              </Select>
            </Field>

            <Field
              label="Reduce motion"
              hint="System default follows your OS reduced-motion setting."
            >
              <Select
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
              </Select>
            </Field>
          </SettingsFields>
        </SettingsPanel>
      </SettingsPanels>
    </main>
  );
}
