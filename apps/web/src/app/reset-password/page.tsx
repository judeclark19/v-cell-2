"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { Button, Panel, PasswordInput } from "@vcell/ui";
import { auth } from "@/lib/firebaseClient";
import { useRouteTransitionRouter } from "@/ui/RouteTransition";

function ResetPasswordInner() {
  const router = useRouteTransitionRouter();
  const searchParams = useSearchParams();

  const rawNext = searchParams.get("next");
  const nextPath = rawNext && rawNext.startsWith("/") ? rawNext : "/game";

  const mode = searchParams.get("mode");
  const oobCode = searchParams.get("oobCode");

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);

  const [email, setEmail] = useState<string | null>(null);
  const [sentinelError, setSentinelError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Verify the code when mode/oobCode changes.
  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      try {
        if (mode !== "resetPassword") {
          if (!cancelled) {
            setSentinelError(
              "The current URL is not a valid password reset link."
            );
            setVerifying(false);
          }
          return;
        }
        if (!oobCode) {
          if (!cancelled) {
            setSentinelError("Missing reset code (oobCode).");
            setVerifying(false);
          }
          return;
        }

        const em = await verifyPasswordResetCode(auth, oobCode);
        if (!cancelled) {
          setEmail(em);
          setVerifying(false);
        }
      } catch (err) {
        if (!cancelled) {
          setSentinelError(
            err instanceof Error
              ? err.message
              : "This password reset link is invalid or expired."
          );
          setVerifying(false);
        }
      }
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, [mode, oobCode]);

  const canSubmit = useMemo(() => {
    return (
      newPassword.length >= 6 && confirm.length >= 6 && newPassword === confirm
    );
  }, [newPassword, confirm]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    if (mode !== "resetPassword") {
      setSentinelError("This link is not a password reset link.");
      return;
    }
    if (!oobCode) {
      setSentinelError("Missing reset code (oobCode).");
      return;
    }
    if (newPassword.length < 6) {
      setSentinelError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setSentinelError("Passwords do not match.");
      return;
    }

    setSentinelError(null);
    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setDone(true);
      // Let the UI show success, then route.
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
    } catch (err) {
      setSentinelError(
        err instanceof Error
          ? err.message
          : "Could not reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel
      padding="lg"
      aria-label="Forgot password form"
      style={{
        maxWidth: 480,
        marginTop: "2rem",
        marginLeft: "auto",
        marginRight: "auto"
      }}
    >
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ marginBottom: 8 }}>Set a new password</h1>
        {email && (
          <p style={{ opacity: 0.85, marginBottom: 0 }}>
            Resetting password for <strong>{email}</strong>
          </p>
        )}
      </header>

      {verifying ? (
        <p>Verifying reset link…</p>
      ) : sentinelError ? (
        <section style={{ maxWidth: 520 }}>
          <p role="alert" style={{ marginBottom: 12 }}>
            {sentinelError}
          </p>
          <Link
            href={`/forgot-password?next=${encodeURIComponent(nextPath)}`}
            style={{ textDecoration: "underline" }}
          >
            Request a new reset email
          </Link>
        </section>
      ) : (
        <form onSubmit={onSubmit} style={{ maxWidth: 520 }}>
          <label style={{ display: "block", marginBottom: 12 }}>
            <span style={{ display: "block", marginBottom: 6 }}>
              New password
            </span>
            <PasswordInput
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="6+ characters"
            />
          </label>

          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ display: "block", marginBottom: 6 }}>
              Confirm new password
            </span>
            <PasswordInput
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              placeholder="Repeat password"
            />
          </label>

          {sentinelError && (
            <p role="alert" style={{ marginBottom: 12 }}>
              {sentinelError}
            </p>
          )}

          <Button type="submit" disabled={!canSubmit || loading}>
            {loading ? "Saving…" : "Update password"}
          </Button>

          <div style={{ marginTop: 12, fontSize: 14, opacity: 0.85 }}>
            {done ? (
              <span>Redirecting to login…</span>
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(nextPath)}`}
                style={{ textDecoration: "underline" }}
              >
                Back to login
              </Link>
            )}
          </div>
        </form>
      )}
    </Panel>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main>
          <p>Loading…</p>
        </main>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
