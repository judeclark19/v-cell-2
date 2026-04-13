import Link from "next/link";

type LoginIntroProps = {
  isOffline: boolean;
  nextPath: string;
  hydrated: boolean;
  uid: string | null;
  isUser: boolean;
};

export function LoginIntro({
  isOffline,
  nextPath,
  hydrated,
  uid,
  isUser
}: LoginIntroProps) {
  return (
    <>
      <header>
        <h1 style={{ marginBottom: 8 }}>Log in</h1>

        {isOffline ? (
          <p role="status" style={{ marginBottom: 16 }}>
            Cloud sync is unavailable right now. Login and signup are
            temporarily unavailable, but you can still{" "}
            <Link
              style={{
                textDecoration: "underline"
              }}
              href={nextPath}
            >
              continue as a guest
            </Link>{" "}
            and play locally on this device.
          </p>
        ) : (
          <>
            <p style={{ marginBottom: 16 }}>
              <Link
                style={{
                  textDecoration: "underline"
                }}
                href={nextPath}
              >
                Continue as a guest
              </Link>{" "}
              to play locally on this device. Log in to unlock stats,
              leaderboard, and sync across devices.
            </p>
            <p style={{ marginBottom: 16, opacity: 0.8 }}>
              After you choose an option, we’ll send you back to{" "}
              <code>{nextPath}</code>.
            </p>
          </>
        )}
      </header>

      {hydrated && uid && (
        <p style={{ marginBottom: 16 }}>
          Current session: <strong>{isUser ? "User" : "Guest"}</strong>
          <span style={{ opacity: 0.7 }}> (uid: {uid.slice(0, 8)}…)</span>
        </p>
      )}
    </>
  );
}
