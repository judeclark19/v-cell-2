"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NavBar as NavBarRow,
  NavBrand,
  NavBurger,
  NavBurgerLine,
  NavButton,
  NavLink,
  NavLinks,
  NavPanel,
  NavRight,
  NavRoot,
  NavTheme,
  Select
} from "@vcell/ui";
import { useSession } from "@/state/auth/AuthProvider";
import { useTheme, type Theme } from "@/state/theme/ThemeProvider";
import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";
import { selectUid } from "@/state/auth/authSlice";
import { openAuthStatusModal } from "@/state/ui/uiSlice";
import type { AppDispatch } from "@/state/reduxStore";
import { useRouteTransitionRouter } from "@/ui/RouteTransition";

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
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouteTransitionRouter();
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  const uid = useSelector(selectUid);

  const handleNavigate = (href: string) => {
    closeMenu();
    router.push(href);
  };

  const handleLogout = async () => {
    await logout();
    closeMenu();
    dispatch(
      openAuthStatusModal({
        title: "Logged out",
        bodyText: "You have successfully logged out."
      })
    );
    router.replace("/login");
  };

  const AuthControl = !hydrated ? null : uid ? (
    <NavButton onClick={handleLogout} type="button">
      Log out
    </NavButton>
  ) : (
    <Link
      href="/login"
      onClick={(event) => {
        event.preventDefault();
        handleNavigate("/login");
      }}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <NavLink as="span" $active={isActive("/login")}>
        Log in
      </NavLink>
    </Link>
  );

  const ThemeControl = (
    <NavTheme>
      <Select
        id="navbar-theme"
        value={theme}
        onChange={(e) => setTheme(e.target.value as Theme)}
        style={{
          backgroundColor: "transparent",
          borderColor: "var(--nav-button-border)"
        }}
      >
        {THEME_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
    </NavTheme>
  );

  return (
    <NavRoot aria-label="Primary">
      <div
        className="max-width-container"
        style={{
          height: "100%",
          boxSizing: "border-box",
          display: "grid"
        }}
      >
        <NavBarRow>
          <Link
            href="/game"
            onClick={(event) => {
              event.preventDefault();
              handleNavigate("/game");
            }}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <NavBrand as="span">
              <Image
                src="/images/vcell-logo.webp"
                alt="V-Cell"
                width={120}
                height={30}
                loading="eager"
                unoptimized
              />
            </NavBrand>
          </Link>

          <NavBurger
            $open={menuOpen}
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="navbar-panel"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <NavBurgerLine $open={menuOpen} />
            <NavBurgerLine $open={menuOpen} />
            <NavBurgerLine $open={menuOpen} />
          </NavBurger>

          <NavPanel id="navbar-panel" $open={menuOpen}>
            <NavLinks>
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={(event) => {
                    event.preventDefault();
                    handleNavigate(href);
                  }}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <NavLink as="span" $active={isActive(href)}>
                    {label}
                  </NavLink>
                </Link>
              ))}
            </NavLinks>

            <NavRight>
              {ThemeControl}
              {AuthControl}
            </NavRight>
          </NavPanel>
        </NavBarRow>
      </div>
    </NavRoot>
  );
}
