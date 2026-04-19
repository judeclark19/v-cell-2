"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { sendPasswordResetEmail } from "firebase/auth";
import { Button } from "@vcell/ui";
import { auth } from "@/lib/firebaseClient";

function ForgotPasswordInner() {
  const searchParams = useSearchParams();

  // Where to return after completing auth flows.
  // Only allow internal paths.
  const rawNext = searchParams.get("next");
  const nextPath = rawNext && rawNext.startsWith("/") ? rawNext : "/game";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const canSubmit = useMemo(() => {
    return email.trim().length > 0;
  }, [email]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setError(null);

    const em = email.trim();
    if (!em) {
      setError("Please enter your email.");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, em, {
        url: `${window.location.origin}/login?next=${encodeURIComponent(nextPath)}`,
        handleCodeInApp: false
      });
      // Intentionally vague: do not leak whether the email exists.
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not send reset email. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ marginBottom: 8 }}>Reset your password</h1>
        <p style={{ opacity: 0.85, marginBottom: 0 }}>
          Enter your email and we’ll send a password reset link.
        </p>
      </header>

      {!sent ? (
        <form onSubmit={onSubmit} style={{ maxWidth: 520 }}>
          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ display: "block", marginBottom: 6 }}>Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              className="control"
              type="email"
            />
          </label>

          {error && (
            <p role="alert" style={{ marginBottom: 12 }}>
              {error}
            </p>
          )}

          <Button type="submit" disabled={!canSubmit || loading}>
            {loading ? "Sending…" : "Send reset email"}
          </Button>

          <div style={{ marginTop: 12, fontSize: 14 }}>
            <Link
              href={`/login?next=${encodeURIComponent(nextPath)}`}
              style={{ textDecoration: "underline" }}
            >
              Back to login
            </Link>
          </div>
        </form>
      ) : (
        <section style={{ maxWidth: 520 }}>
          <p style={{ marginBottom: 12 }}>
            If an account exists for <strong>{email.trim()}</strong>, we sent a
            password reset link.
          </p>
          <p style={{ marginBottom: 16, opacity: 0.85 }}>
            Check your email, especially the spam folder! After you reset your
            password, come back and log in.
          </p>
          <Button as={Link} href={`/login?next=${encodeURIComponent(nextPath)}`}>
            Return to login
          </Button>
        </section>
      )}
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<main />}>
      <ForgotPasswordInner />
    </Suspense>
  );
}
