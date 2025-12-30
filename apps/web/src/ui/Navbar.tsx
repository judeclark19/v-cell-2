"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/state/session/SessionProvider";
import "./navbar.css";

const NAV_LINKS = [
  { href: "/game", label: "Game" },
  { href: "/settings", label: "Settings" },
  { href: "/stats", label: "Stats" }
];

export function NavBar() {
  const { isUser, logout, hydrated } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const [menuOpen, setMenuOpen] = useState(false);

  // Close the menu after navigation (mobile UX)
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    router.push("/login");
  };

  // Stable initial render to avoid SSR/CSR mismatch.
  const AuthControl = !hydrated ? (
    <Link className="navbar__link" href="/login">
      Log in
    </Link>
  ) : isUser ? (
    <button className="navbar__button" onClick={handleLogout} type="button">
      Log out
    </button>
  ) : (
    <Link className="navbar__link" href="/login">
      Log in
    </Link>
  );

  return (
    <nav className="navbar" aria-label="Primary">
      <div className="max-width-container">
        <div className="navbar__bar">
          <Link className="navbar__brand" href="/game">
            V-Cell
          </Link>

          <button
            className={`navbar__burger ${menuOpen ? "is-open" : ""}`}
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="navbar-panel"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="navbar__burgerLine" />
            <span className="navbar__burgerLine" />
            <span className="navbar__burgerLine" />
          </button>

          <div
            id="navbar-panel"
            className={`navbar__panel ${menuOpen ? "is-open" : ""}`}
          >
            <div className="navbar__links">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  className={`navbar__link ${
                    isActive(href) ? "navbar__link--active" : ""
                  }`}
                  href={href}
                >
                  {label}
                </Link>
              ))}
              <div className="navbar__auth navbar__auth--desktop">
                {AuthControl}
              </div>
            </div>

            <div className="navbar__auth navbar__auth--mobile">
              {AuthControl}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
