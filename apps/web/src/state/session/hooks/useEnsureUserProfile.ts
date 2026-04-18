"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebaseClient";
import { clearCompletedGames } from "@/persistence/completedGamesStore";
import {
  getInProgressGameForDevice,
  upsertInProgressGame
} from "@/persistence/inProgressGamesStore";
import { getOrCreateDeviceId } from "@/persistence/schema";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";

export type EnsureUserProfileState = {
  uid: string | null;
  ready: boolean;
  needsHowToPlay: boolean;
  displayName?: string | null;
  error?: string | null;
};

/**
 * Ensures the Firestore user doc exists and is up to date after login.
 * Also runs the local first-login migration exactly when we first see this uid.
 */
export function useEnsureUserProfile(uid: string | null, authReady: boolean) {
  const [profileState, setProfileState] = useState<EnsureUserProfileState>({
    uid: null,
    ready: false,
    needsHowToPlay: false,
    displayName: null,
    error: null
  });

  // Always call hooks in the same order. We derive the return value
  // without early-returning before `useEffect`.
  const derivedState: EnsureUserProfileState = !authReady
    ? {
        uid: null,
        ready: false,
        needsHowToPlay: false,
        displayName: null,
        error: null
      }
    : !uid
      ? {
          uid: null,
          ready: true,
          needsHowToPlay: false,
          displayName: null,
          error: null
        }
      : profileState.uid !== uid
        ? {
            uid,
            ready: false,
            needsHowToPlay: false,
            displayName: null,
            error: null
          }
        : profileState;

  useEffect(() => {
    if (!authReady || !uid) return;

    let cancelled = false;
    let unsub: (() => void) | null = null;

    (async () => {
      try {
        const userRef = doc(db, "users", uid);
        const snap = await getDoc(userRef);
        const isFirstSignup = !snap.exists();

        const now = Date.now();
        const authUser = auth.currentUser;
        const authDisplayName = authUser?.displayName ?? null;
        const authEmail = authUser?.email ?? null;
        const authProviders = (authUser?.providerData ?? [])
          .map((p) => p.providerId)
          .filter(Boolean);

        if (isFirstSignup) {
          // First time we ever see this uid: seed the user doc with defaults.
          await setDoc(
            userRef,
            {
              createdAtMs: now,
              lastLoginAtMs: now,
              displayName: authDisplayName,
              needsHowToPlay: true,
              email: authEmail,
              providers: authProviders
            },
            { merge: true }
          );
        } else {
          // Returning user: do NOT clobber user-chosen profile fields.
          const data = snap.data();

          const updates: Record<string, unknown> = {
            lastLoginAtMs: now
          };

          // Firebase Auth is the canonical display-name source.
          if (
            authDisplayName &&
            authDisplayName !==
              (typeof data?.displayName === "string" ? data.displayName : null)
          ) {
            updates.displayName = authDisplayName;
          }

          if ((data?.email == null || data?.email === "") && authEmail) {
            updates.email = authEmail;
          }

          // Merge providers (keep existing, add any new ones).
          const existingProviders: string[] = Array.isArray(data?.providers)
            ? (data?.providers as string[])
            : [];
          const mergedProviders = Array.from(
            new Set([...(existingProviders ?? []), ...authProviders])
          ).sort();
          const existingSorted = Array.from(new Set(existingProviders)).sort();
          if (mergedProviders.join("|") !== existingSorted.join("|")) {
            updates.providers = mergedProviders;
          }

          await setDoc(userRef, updates, { merge: true });
        }

        if (isFirstSignup) {
          // Local first-login migration:
          // - wipe local completed history (it will later come from the account)
          // - stamp the current in-progress game with userId
          await clearCompletedGames();

          const deviceId = getOrCreateDeviceId();
          const inProgress = await getInProgressGameForDevice(deviceId);
          if (inProgress) {
            await upsertInProgressGame({ ...inProgress, userId: uid });
          }

          // Mark that we ran the local first-login migration so any future
          // Firestore -> IndexedDB hydration can choose an explicit strategy.
          await setDoc(
            userRef,
            {
              didLocalMigrationAtMs: Date.now(),
              didLocalMigrationDeviceId: deviceId,
              cloudHydrationStrategy: "cloud_wins_after_first_login"
            },
            { merge: true }
          );

          // Local marker for clients: allows us to skip initial cloud pull during this login.
          // (Future hydration code can consult this and clear it once pull completes.)
          try {
            // Device-scoped marker: only this device should skip the initial cloud pull
            // during the first-signup login that just performed local migration.
            // Other devices should NOT skip cloud hydration.
            localStorage.setItem(
              `vcell:skipCloudPull:${uid}:${deviceId}`,
              JSON.stringify({
                ts: Date.now(),
                reason: "first_signup_local_migration"
              })
            );
          } catch {
            // ignore (private mode / storage disabled)
          }
          try {
            localStorage.removeItem(`vcell:skipCloudPull:${uid}`);
          } catch {
            // ignore
          }
        }

        // Subscribe so routing state like needsHowToPlay updates immediately.
        if (cancelled) return;

        unsub = onSnapshot(
          userRef,
          (snap) => {
            if (cancelled) return;
            const data = snap.data();

            const displayName =
              typeof data?.displayName === "string" ? data.displayName : null;
            const needsHowToPlay = Boolean(data?.needsHowToPlay);

            setProfileState({
              uid,
              ready: true,
              needsHowToPlay,
              displayName,
              error: null
            });
          },
          (err) => {
            console.error("[session] user doc snapshot error", err);
            if (cancelled) return;
            // Fallback to Auth-only info if snapshot fails.
            const displayName = auth.currentUser?.displayName ?? null;
            setProfileState({
              uid,
              ready: true,
              needsHowToPlay: false,
              displayName,
              error: "Failed to read profile."
            });
          }
        );
      } catch (err) {
        console.error("[session] failed to upsert user doc", err);
        if (cancelled) return;
        setProfileState({
          uid,
          ready: true,
          needsHowToPlay: false,
          displayName: null,
          error: "Failed to load profile."
        });
      }
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [uid, authReady]);

  return derivedState;
}
