"use client";

import { createGlobalStyle } from "styled-components";
import { GoogleSignInStyles } from "./GoogleSignInStyles";

const GlobalStyleSheet = createGlobalStyle`
  /*
   * These globals are the initial theme contract for primitives that live in
   * @vcell/ui. They are now the source of truth for app-wide tokens, themes,
   * resets, and shared utility classes.
   */
  :root {
    --vcell-ui-runtime: "styled-components";

    --red-500: #ff194c;
    --red-600: #d41d45;

    --green-100: #ebf8f5;
    --green-200: #b8d1c7;
    --green-300: #84ab99;
    --green-400: #50856b;
    --green-500: #1c5f3d;
    --green-600: #174f34;
    --green-700: #123f2b;
    --green-800: #0d2f22;
    --green-900: #061e18;

    --blue-100: #cee5ff;
    --blue-200: #a4cfff;
    --blue-300: #79b8ff;
    --blue-400: #4c94f5;
    --blue-500: #1f6feb;
    --blue-600: #1955bd;
    --blue-700: #133b8f;
    --blue-800: #0d2161;
    --blue-900: #050832;

    --white-000: #ffffff;
    --white-100: #fffdfd;
    --white-200: #f7f5f2;
    --white-300: #f0eae4;

    --black-100: #dbdad9;
    --black-200: #b5b4b4;
    --black-300: #8f8e8f;
    --black-400: #69686a;
    --black-500: #434245;
    --black-600: #1d1c20;
    --black-700: #19181b;
    --black-800: #141316;
    --black-900: #000000;

    --purple-800: #261722;

    --error-100: #ff8585;

    --focus-100: #9dffce;
    --focus-200: #89e3da;
    --focus-300: #75c7e6;
    --focus-400: #61abf2;
    --focus-500: #4d90fe;

    --z-base: 0;
    --z-card: 1;
    --z-drag: 100;
    --z-overlay: 200;
    --z-navbar: 400;
    --z-popover: 500;
    --z-modal: 600;

    --font-ui: "Avenir Next", "Trebuchet MS", "Segoe UI", Arial, sans-serif;
    --radius: 8px;
    --radius-lg: 12px;
    --card-radius: 8px;
    --card-gap: 10px;

    --poker-red: #ef3e56;
    --background-primary: var(--green-500);
    --background-secondary: var(--green-700);
    --foreground: #e9f6ee;
    --surface: #0f2216;
    --surface-hover: #16301f;
    --border: rgba(233, 246, 238, 0.18);
    --accent: #d4af37;
    --accent-contrast: #08140c;
    --kb-highlight: #7c3aed;
    --kb-highlight-contrast: #ffffff;
    --muted: rgba(233, 246, 238, 0.65);
    --board-bg: var(--background-primary);
    --tableau-bg: color-mix(in srgb, var(--background-primary) 85%, #ffffff 15%);
    --board-border-image: url("/images/wood.webp");
    --board-border-color: transparent;

    --focus-alpha: 35%;
    --focus-ring: 0 0 0 3px
      color-mix(in srgb, var(--accent) var(--focus-alpha), transparent);
    --focus-ring-strong: 0 0 0 5px
        color-mix(in srgb, var(--accent) 55%, transparent),
      0 0 0 2px color-mix(in srgb, var(--accent) 90%, transparent);

    --btn-radius: 10px;
    --btn-border: var(--border);
    --btn-primary-bg: var(--accent);
    --btn-primary-fg: var(--accent-contrast);
    --btn-secondary-bg: color-mix(in srgb, var(--surface-hover) 70%, transparent);
    --btn-secondary-fg: var(--foreground);
    --btn-ghost-bg: transparent;
    --btn-ghost-fg: var(--foreground);

    --banner-prompt-border: color-mix(in srgb, var(--accent) 18%, var(--border));
    --banner-prompt-bg: linear-gradient(
      90deg,
      color-mix(in srgb, var(--surface-hover) 82%, var(--surface)) 0%,
      color-mix(in srgb, var(--surface) 88%, white 12%) 100%
    );
    --banner-status-border: color-mix(in srgb, var(--accent) 22%, var(--border));
    --banner-status-bg: linear-gradient(
      90deg,
      color-mix(in srgb, var(--accent) 16%, var(--surface)) 0%,
      color-mix(in srgb, var(--surface-hover) 88%, var(--surface)) 100%
    );
    --banner-debug-bg: color-mix(in srgb, var(--surface) 90%, black 10%);

    --nav-height: 80px;
    --nav-bg: var(--surface);
    --nav-hover-bg: var(--surface-hover);
    --nav-border: var(--border);
    --nav-button-border: var(--border);

    --control-radius: 8px;
    --control-border: var(--border);
    --control-bg: color-mix(in srgb, #0f2216 80%, transparent);
    --control-fg: var(--foreground);

    --panel-radius: 16px;
    --panel-bg: #123f2b;
    --panel-shadow: 0 6px 24px 0 #141316;

    --modal-radius: 8px;
    --modal-overlay-bg: color-mix(in srgb, #1c5f3d 35%, transparent);
    --modal-bg: color-mix(in srgb, #0f2216 85%, transparent);
    --modal-border: color-mix(in srgb, rgba(0, 0, 0, 0.35) 35%, transparent);
    --modal-shadow: 0 18px 50px rgba(0, 0, 0, 0.55);

    --select-chevron: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 20 20'%3E%3Cpath fill='%23e9f6ee' d='M5.5 7.5 10 12l4.5-4.5 1.5 1.5L10 15 4 9z'/%3E%3C/svg%3E");

    --tabs-fg: #87a095;
    --tabs-border: #87a095;
    --tabs-active-fg: #ffffff;
    --tabs-active-border: #ffffff;

    --card-front-bg: #f7f3e8;
    --card-front-bg-locked: #d6ccb6;
    --card-front-fg: #111;
    --card-front-border: rgba(0, 0, 0, 0.35);
    --card-front-border-locked: rgba(0, 0, 0, 0.45);
    --card-front-inset: rgba(255, 255, 255, 0.35);
    --card-back-bg: color-mix(in srgb, var(--surface) 70%, #000 30%);
    --card-back-border: color-mix(in srgb, var(--card-front-bg) 60%, transparent);
    --card-back-pattern-a: var(--poker-red);
    --card-back-pattern-b: color-mix(in srgb, var(--poker-red) 85%, #000 15%);
    --card-slot-bg: color-mix(in srgb, var(--background-primary) 85%, #000 15%);
    --card-slot-border: rgba(233, 246, 238, 0.25);
    --card-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
    --card-shadow-hover: 0 12px 24px rgba(0, 0, 0, 0.45);
  }

  :root[data-theme="times-light"] {
    --background-primary: var(--white-200);
    --background-secondary: var(--white-100);
    --foreground: #171717;
    --surface: #f6f6f6;
    --surface-hover: #ececec;
    --border: rgba(0, 0, 0, 0.12);
    --accent: #1f6feb;
    --accent-contrast: #ffffff;
    --kb-highlight: #b45309;
    --kb-highlight-contrast: #ffffff;
    --muted: rgba(23, 23, 23, 0.55);
    --board-bg: var(--background-primary);
    --tableau-bg: color-mix(in srgb, var(--background-primary) 94%, #000000 6%);
    --board-border-image: none;
    --board-border-color: var(--border);
    --focus-alpha: 25%;
    --control-bg: color-mix(in srgb, #f6f6f6 80%, transparent);
    --control-fg: var(--foreground);
    --panel-bg: #fffdfd;
    --panel-shadow: 0 6px 24px 0 rgba(20, 19, 22, 0.16);
    --modal-overlay-bg: color-mix(in srgb, #fffdfd 45%, transparent);
    --modal-bg: color-mix(in srgb, #f6f6f6 92%, transparent);
    --modal-border: color-mix(in srgb, rgba(0, 0, 0, 0.22) 35%, transparent);
    --modal-shadow: 0 18px 50px rgba(20, 19, 22, 0.18);
    --select-chevron: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 20 20'%3E%3Cpath fill='%23171717' d='M5.5 7.5 10 12l4.5-4.5 1.5 1.5L10 15 4 9z'/%3E%3C/svg%3E");
    --tabs-fg: #5f6b65;
    --tabs-border: #5f6b65;
    --tabs-active-fg: #171717;
    --tabs-active-border: #171717;
    --card-front-bg: #ffffff;
    --card-front-bg-locked: #e2e2e2;
    --card-front-fg: #111;
    --card-front-border: rgba(0, 0, 0, 0.22);
    --card-front-border-locked: rgba(0, 0, 0, 0.32);
    --card-front-inset: rgba(255, 255, 255, 0.7);
    --card-back-bg: #eef4ff;
    --card-back-border: color-mix(in srgb, var(--card-front-bg) 55%, transparent);
    --card-back-pattern-a: rgba(31, 111, 235, 0.1);
    --card-back-pattern-b: rgba(31, 111, 235, 0.2);
    --card-slot-bg: rgba(0, 0, 0, 0.03);
    --card-slot-border: rgba(0, 0, 0, 0.18);
    --card-shadow: 0 8px 18px rgba(0, 0, 0, 0.14);
    --card-shadow-hover: 0 12px 24px rgba(0, 0, 0, 0.2);
    --card-locked-opacity: 0.7;
    --card-locked-filter: saturate(0.55) brightness(0.98);
  }

  :root[data-theme="times-dark"] {
    --background-primary: var(--black-800);
    --background-secondary: var(--black-700);
    --foreground: #f1f1f1;
    --surface: #16161a;
    --surface-hover: #1f1f24;
    --border: rgba(255, 255, 255, 0.14);
    --accent: #79b8ff;
    --accent-contrast: #0b0b0d;
    --kb-highlight: #22c55e;
    --kb-highlight-contrast: #0b0b0d;
    --muted: rgba(241, 241, 241, 0.6);
    --board-bg: var(--background-primary);
    --tableau-bg: #24242c;
    --board-border-image: none;
    --board-border-color: var(--border);
    --focus-alpha: 35%;
    --control-bg: color-mix(in srgb, #16161a 80%, transparent);
    --control-fg: var(--foreground);
    --panel-bg: #19181b;
    --panel-shadow: 0 6px 24px 0 rgba(0, 0, 0, 0.45);
    --modal-overlay-bg: color-mix(in srgb, #141316 42%, transparent);
    --modal-bg: color-mix(in srgb, #16161a 92%, transparent);
    --modal-border: color-mix(in srgb, rgba(255, 255, 255, 0.22) 35%, transparent);
    --modal-shadow: 0 18px 50px rgba(0, 0, 0, 0.6);
    --select-chevron: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 20 20'%3E%3Cpath fill='%23f1f1f1' d='M5.5 7.5 10 12l4.5-4.5 1.5 1.5L10 15 4 9z'/%3E%3C/svg%3E");
    --tabs-fg: #8f8e8f;
    --tabs-border: #8f8e8f;
    --tabs-active-fg: #f1f1f1;
    --tabs-active-border: #f1f1f1;
    --card-front-bg: color-mix(in srgb, var(--background-secondary) 82%, #ffffff 18%);
    --card-front-bg-locked: #141418;
    --card-front-fg: #f4f4f4;
    --card-front-border: rgba(255, 255, 255, 0.22);
    --card-front-border-locked: rgba(255, 255, 255, 0.32);
    --card-front-inset: rgba(255, 255, 255, 0.1);
    --card-back-bg: #0f0f13;
    --card-back-border: color-mix(in srgb, var(--card-front-bg) 55%, transparent);
    --card-back-pattern-a: rgba(121, 184, 255, 0.1);
    --card-back-pattern-b: rgba(0, 0, 0, 0.35);
    --card-slot-bg: rgba(255, 255, 255, 0.03);
    --card-slot-border: rgba(255, 255, 255, 0.16);
    --card-shadow: 0 10px 22px rgba(0, 0, 0, 0.55);
    --card-shadow-hover: 0 14px 28px rgba(0, 0, 0, 0.65);
    --card-locked-opacity: 0.68;
    --card-locked-filter: saturate(0.55) brightness(0.92);
  }

  @media (max-width: 640px) {
    :root {
      --card-gap: 8px;
    }
  }

  @media (prefers-color-scheme: dark) {
    :root:not([data-theme]) {
      --background-primary: var(--black-800);
      --background-secondary: var(--black-700);
      --foreground: #f1f1f1;
      --surface: #16161a;
      --surface-hover: #1f1f24;
      --border: rgba(255, 255, 255, 0.14);
      --accent: #79b8ff;
      --accent-contrast: #0b0b0d;
      --kb-highlight: #22c55e;
      --kb-highlight-contrast: #0b0b0d;
      --muted: rgba(241, 241, 241, 0.6);
      --board-bg: var(--background-primary);
      --tableau-bg: #24242c;
      --board-border-image: none;
      --board-border-color: var(--border);
      --focus-alpha: 35%;
      --control-bg: color-mix(in srgb, #16161a 80%, transparent);
      --control-fg: var(--foreground);
      --panel-bg: #19181b;
      --panel-shadow: 0 6px 24px 0 rgba(0, 0, 0, 0.45);
      --modal-overlay-bg: color-mix(in srgb, #141316 42%, transparent);
      --modal-bg: color-mix(in srgb, #16161a 92%, transparent);
      --modal-border: color-mix(in srgb, rgba(255, 255, 255, 0.22) 35%, transparent);
      --modal-shadow: 0 18px 50px rgba(0, 0, 0, 0.6);
      --select-chevron: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 20 20'%3E%3Cpath fill='%23f1f1f1' d='M5.5 7.5 10 12l4.5-4.5 1.5 1.5L10 15 4 9z'/%3E%3C/svg%3E");
      --tabs-fg: #8f8e8f;
      --tabs-border: #8f8e8f;
      --tabs-active-fg: #f1f1f1;
      --tabs-active-border: #f1f1f1;
      --card-front-bg: color-mix(in srgb, var(--background-primary) 82%, #ffffff 18%);
      --card-front-bg-locked: #141418;
      --card-front-fg: #f4f4f4;
      --card-front-border: rgba(255, 255, 255, 0.22);
      --card-front-border-locked: rgba(255, 255, 255, 0.32);
      --card-front-inset: rgba(255, 255, 255, 0.1);
      --card-back-bg: #0f0f13;
      --card-back-border: color-mix(in srgb, var(--card-front-bg) 55%, transparent);
      --card-back-pattern-a: rgba(121, 184, 255, 0.1);
      --card-back-pattern-b: rgba(0, 0, 0, 0.35);
      --card-slot-bg: rgba(255, 255, 255, 0.03);
      --card-slot-border: rgba(255, 255, 255, 0.16);
      --card-shadow: 0 10px 22px rgba(0, 0, 0, 0.55);
      --card-shadow-hover: 0 14px 28px rgba(0, 0, 0, 0.65);
      --card-locked-opacity: 0.68;
      --card-locked-filter: saturate(0.55) brightness(0.92);
    }
  }

  html,
  body {
    max-width: 100vw;
  }

  body {
    min-height: 100dvh;
    color: var(--foreground);
    background: var(--background-primary);
    font-family: var(--font-ui);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;

    display: flex;
    flex-direction: column;
  }

  .app-main {
    flex: 1;
    min-height: 0;
  }

  .app-main > .max-width-container {
    min-height: 0;
  }

  * {
    box-sizing: border-box;
    padding: 0;
    margin: 0;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  :focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
    border-radius: 6px;
  }

  h1,
  h2 {
    margin-bottom: 1rem;
  }
  h3 {
    margin-bottom: 0.5rem;
  }

  header {
    margin-bottom: 16px;
  }

  .max-width-container {
    max-width: 1440px;
    margin: 0 auto;
    padding: 16px;
    box-sizing: content-box;

    @media (max-width: 640px) {
      padding: 8px;
    }
  }

  .full-width {
    width: 100%;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 20px;
  }

  .flex-col {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    justify-content: center;
  }

  .hint {
    margin: 0;
    color: var(--muted);
    font-size: 0.9rem;
  }

  .prose {
    line-height: 1.5;
  }

  .prose h1 {
    font-size: clamp(1.6rem, 2.2vw, 2.2rem);
    letter-spacing: -0.02em;
  }

  .prose h2 {
    margin-top: 2px;
    font-size: 1.15rem;
  }

  .prose h3 {
    margin-top: 2px;
    font-size: 1rem;
  }

  .prose p {
    margin-top: 10px;
    color: var(--foreground);
  }

  .prose p.hint,
  .prose .hint {
    color: var(--muted);
  }

  .prose ul {
    margin-top: 10px;
    padding-left: 1.1rem;
  }

  .prose li {
    margin-top: 8px;
  }

  .prose li:first-child {
    margin-top: 0;
  }

  .prose strong {
    font-weight: 700;
  }

  .stats-page-main {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 2rem;
  }

  .stats-page-main > * {
    min-width: 0;
  }

  @media (max-width: 900px) {
    .stats-page-main {
      grid-template-columns: 1fr;
    }
  }
`;

export function GlobalStyles() {
  return (
    <>
      <GlobalStyleSheet />
      <GoogleSignInStyles />
    </>
  );
}
