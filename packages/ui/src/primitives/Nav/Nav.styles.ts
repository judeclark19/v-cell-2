"use client";

import styled, { css } from "styled-components";

type NavPanelProps = {
  $open: boolean;
};

type NavBurgerProps = {
  $open: boolean;
};

type NavLinkProps = {
  $active?: boolean;
};

export const NavRoot = styled.nav`
  position: sticky;
  top: 0;
  z-index: var(--z-navbar, 400);

  background: var(--nav-bg);
  border-bottom: 1px solid var(--nav-border);
  backdrop-filter: blur(8px);
`;

export const NavBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const interactiveBase = css`
  font: inherit;
  color: inherit;
  text-decoration: none;
  border-radius: var(--radius);
  transition:
    background 120ms ease,
    border-color 120ms ease,
    transform 120ms ease;

  &:hover {
    background: var(--nav-hover-bg);
  }
`;

export const NavBrand = styled.a`
  ${interactiveBase}
  font-weight: 700;
  letter-spacing: 0.3px;
  padding: 6px 8px;

  @media (max-width: 675px) {
    padding: 10px;
  }
`;

export const NavBurger = styled.button<NavBurgerProps>`
  display: none;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 4px;

  width: 40px;
  height: 40px;
  border-radius: var(--radius);
  border: 1px solid var(--nav-button-border);
  background: transparent;
  cursor: pointer;

  @media (max-width: 675px) {
    display: inline-flex;
  }
`;

export const NavBurgerLine = styled.span<NavBurgerProps>`
  display: block;
  width: 18px;
  height: 2px;
  background: var(--foreground);
  border-radius: 999px;
  transition: transform 250ms ease, opacity 200ms ease;
  transform-origin: center;

  &:nth-child(1) {
    transform: ${({ $open }) =>
      $open ? "translateY(6px) rotate(45deg)" : "none"};
  }

  &:nth-child(2) {
    opacity: ${({ $open }) => ($open ? 0 : 1)};
  }

  &:nth-child(3) {
    transform: ${({ $open }) =>
      $open ? "translateY(-6px) rotate(-45deg)" : "none"};
  }
`;

export const NavPanel = styled.div<NavPanelProps>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  @media (max-width: 675px) {
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    border-bottom: 1px solid var(--nav-border);
    background: var(--surface);

    max-height: ${({ $open }) => ($open ? "90vh" : "0")};
    overflow: hidden;
    opacity: ${({ $open }) => ($open ? 1 : 0)};
    transform: ${({ $open }) => ($open ? "translateY(0)" : "translateY(-6px)")};
    pointer-events: ${({ $open }) => ($open ? "auto" : "none")};
    padding: ${({ $open }) => ($open ? "16px" : "0 16px")};
    transition:
      max-height 500ms ease,
      opacity 500ms ease,
      transform 500ms ease,
      padding 500ms ease;

    :root[data-reduced-motion="true"] & {
      transition: none;
      transform: none;
    }
  }
`;

export const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  @media (max-width: 675px) {
    flex-direction: column;
    align-items: flex-end;
  }
`;

export const NavRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;

  @media (max-width: 675px) {
    justify-content: flex-end;
    width: 100%;
  }
`;

export const NavTheme = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  @media (max-width: 675px) {
    justify-content: flex-end;
  }
`;

export const NavLink = styled.a<NavLinkProps>`
  ${interactiveBase}
  padding: 8px 10px;

  ${({ $active }) =>
    $active
      ? css`
          font-weight: 600;
          background: transparent;
          color: var(--foreground);
          box-shadow:
            inset 0 0 0 1px color-mix(in srgb, var(--accent) 55%, transparent),
            0 0 12px color-mix(in srgb, var(--accent) 35%, transparent);

          &:hover {
            background: var(--accent);
          }
        `
      : ""}

  @media (max-width: 675px) {
    padding: 10px;
  }
`;

export const NavButton = styled.button`
  ${interactiveBase}
  padding: 8px 10px;
  background: transparent;
  border: 1px solid var(--nav-button-border);
  cursor: pointer;

  &:active {
    transform: translateY(1px);
  }

  @media (max-width: 675px) {
    padding: 10px;
  }
`;
