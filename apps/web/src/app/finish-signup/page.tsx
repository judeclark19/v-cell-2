"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseClient";
import { useSession } from "@/state/auth/AuthProvider";
import { selectUid } from "@/state/auth/authSlice";
import { useSelector } from "react-redux";

export default function FinishSignupPage() {
  const router = useRouter();
  const { profileReady, profileComplete, displayName } = useSession();

  const uid = useSelector(selectUid);

  const initialName = useMemo(
    () => displayName ?? auth.currentUser?.displayName ?? "",
    [displayName]
  );
  const [name, setName] = useState(initialName);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileReady) return;

    // If we’re logged out, bounce (AuthGate should usually prevent reaching here, but belt+suspenders).
    if (!uid) {
      router.replace("/login");
      return;
    }

    // If profile is already complete, don’t let them hang out here.
    if (profileComplete) {
      router.replace("/");
    }
  }, [profileReady, uid, profileComplete, router]);

  useEffect(() => {
    if (saving) return;
    if (isDirty) return;
    setName(initialName);
  }, [initialName, isDirty, saving]);

  if (!profileReady) return null;
  if (!uid) return null;
  if (profileComplete) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Display name must be at least 2 characters.");
      return;
    }

    const user = auth.currentUser;
    if (!user || !uid) {
      setError("You are not logged in.");
      return;
    }

    try {
      setSaving(true);

      // 1) Firebase Auth displayName
      await updateProfile(user, { displayName: trimmed });

      // 2) Firestore user doc (source of truth)
      await setDoc(
        doc(db, "users", uid),
        {
          uid,
          displayName: trimmed,
          profileComplete: true,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      // SessionProvider / ensureUserProfile should observe this and flip profileComplete -> true.
      // Navigation is owned by the redirect effect/AuthGate once profileComplete updates.
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save display name.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: "40px auto", padding: 16 }}>
      <h1>Finish signup</h1>
      <p>Add a display name to continue.</p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Display name</span>
          <input
            value={name}
            onChange={(e) => {
              setIsDirty(true);
              setName(e.target.value);
            }}
            placeholder="e.g. Jude"
            disabled={saving}
            autoFocus
            className="control"
          />
        </label>

        {error ? <p style={{ color: "crimson" }}>{error}</p> : null}

        <button type="submit" disabled={saving} className="btn btn--primary">
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </main>
  );
}
