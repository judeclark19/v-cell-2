"use client";

import { createGlobalStyle } from "styled-components";

const GlobalStyleSheet = createGlobalStyle`
  /*
   * These globals are the initial theme contract for primitives that live in
   * @vcell/ui. They intentionally duplicate the current app theme values so
   * new UI-package primitives do not depend on legacy CSS files for tokens.
   */
  :root {
    --vcell-ui-runtime: "styled-components";

    --foreground: #e9f6ee;
    --surface-hover: #16301f;
    --border: rgba(233, 246, 238, 0.18);
    --accent: #d4af37;
    --accent-contrast: #08140c;

    --focus-alpha: 35%;
    --focus-ring: 0 0 0 3px
      color-mix(in srgb, var(--accent) var(--focus-alpha), transparent);

    --btn-radius: 10px;
    --btn-border: var(--border);
    --btn-primary-bg: var(--accent);
    --btn-primary-fg: var(--accent-contrast);
    --btn-secondary-bg: color-mix(in srgb, var(--surface-hover) 70%, transparent);
    --btn-secondary-fg: var(--foreground);
    --btn-ghost-bg: transparent;
    --btn-ghost-fg: var(--foreground);

    --panel-radius: 16px;
    --panel-bg: #123f2b;
    --panel-shadow: 0 6px 24px 0 #141316;
  }

  :root[data-theme="times-light"] {
    --foreground: #171717;
    --surface-hover: #ececec;
    --border: rgba(0, 0, 0, 0.12);
    --accent: #1f6feb;
    --accent-contrast: #ffffff;
    --focus-alpha: 25%;
    --panel-bg: #fffdfd;
    --panel-shadow: 0 6px 24px 0 rgba(20, 19, 22, 0.16);
  }

  :root[data-theme="times-dark"] {
    --foreground: #f1f1f1;
    --surface-hover: #1f1f24;
    --border: rgba(255, 255, 255, 0.14);
    --accent: #79b8ff;
    --accent-contrast: #0b0b0d;
    --focus-alpha: 35%;
    --panel-bg: #19181b;
    --panel-shadow: 0 6px 24px 0 rgba(0, 0, 0, 0.45);
  }
`;

export function GlobalStyles() {
  return <GlobalStyleSheet />;
}
