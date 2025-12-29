"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/state/session/SessionProvider";

export function NavBar() {
  const { isUser, logout, hydrated } = useSession();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <nav style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <Link href="/game">Game</Link>
      <Link href="/settings">Settings</Link>
      <Link href="/stats">Stats</Link>

      {!hydrated ? (
        <Link href="/login" style={{ marginLeft: "auto" }}>
          Log in
        </Link>
      ) : isUser ? (
        <button onClick={handleLogout} style={{ marginLeft: "auto" }}>
          Log out
        </button>
      ) : (
        <Link href="/login" style={{ marginLeft: "auto" }}>
          Log in
        </Link>
      )}
    </nav>
  );
}
