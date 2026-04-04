"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/state/auth/AuthProvider";
import { useTheme, type Theme } from "@/state/theme/ThemeProvider";
import "./navbar.css";
import Image from "next/image";
import { useSelector } from "react-redux";
import { selectUid } from "@/state/auth/authSlice";

const NAV_LINKS = [
  { href: "/game", label: "Game" },
  { href: "/how-to-play", label: "How to Play" },
  { href: "/settings", label: "Settings" },
  { href: "/stats", label: "Stats" }
];

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "poker", label: "🃏" },
  { value: "times-light", label: "☀️" },
  { value: "times-dark", label: "🌙" }
];

export function NavBar() {
  const { logout, hydrated } = useSession();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  const uid = useSelector(selectUid);

  const handleLogout = async () => {
    await logout();
    closeMenu();
    router.replace("/login");
  };

  const AuthControl = !hydrated ? null : uid ? (
    <button className="navbar__button" onClick={handleLogout} type="button">
      Log out
    </button>
  ) : (
    <Link
      className={`navbar__link ${isActive("/login") ? "navbar__link--active" : ""}`}
      href="/login"
      onClick={closeMenu}
    >
      Log in
    </Link>
  );

  const ThemeControl = (
    <div className="navbar__theme">
      {/* <label className="navbar__themeLabel" htmlFor="navbar-theme">
        Theme
      </label> */}
      <select
        id="navbar-theme"
        className="navbar__select"
        value={theme}
        onChange={(e) => setTheme(e.target.value as Theme)}
      >
        {THEME_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <nav className="navbar" aria-label="Primary">
      <div className="max-width-container">
        <div className="navbar__bar">
          <Link className="navbar__brand" href="/game" onClick={closeMenu}>
            {/* V-Cell */}
            <Image
              src="/images/vcell-logo.webp"
              alt="V-Cell"
              width={120}
              height={30}
              loading="eager"
              unoptimized
            />
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
                  onClick={closeMenu}
                >
                  {label}
                </Link>
              ))}
            </div>

            <div className="navbar__right">
              {ThemeControl}
              {AuthControl}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
