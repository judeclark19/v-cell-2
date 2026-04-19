"use client";

import { createGlobalStyle } from "styled-components";

const GlobalStyleSheet = createGlobalStyle`
  /*
   * Step 1 of the migration keeps existing CSS in place.
   * This file exists so the app is wired for future design-system globals.
   */
  :root {
    --vcell-ui-runtime: "styled-components";
  }
`;

export function GlobalStyles() {
  return <GlobalStyleSheet />;
}
