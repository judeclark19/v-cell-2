# V-Cell V2 — Project TODO (High-Level)

This is the end-to-end checklist for rebuilding V-Cell as a clean monorepo with a pure TS engine, a web app UI, offline-first support, and account-based stat sync. We’ll break items down further as we reach them.

**Code phrase:** When I say **“update documentation”**, please review and propose edits to `todo.md`, `v_cell_rebuild_plan.md`, and `README.md` based on current repo state.

---

## 0) Repo + Tooling Baseline

- [x] Root `.gitignore` (node_modules, dist, env files, etc.)
- [x] Decide package manager (npm vs pnpm vs yarn) and stick to it - decided npm
- [x] TypeScript node environment sanity (ensure `console` is typed via `@types/node` and tsconfig `types: ["node"]`)
- [x] Monorepo setup (workspaces)
  - [x] Root `package.json` with workspaces: `packages/*`, `apps/*`
  - [x] Root `npm install` works (workspaces:\*)
- [ ] Root tooling scripts (dev/test/check/build entrypoints for web + engine) — still needed; workspace scripts exist but root-level "check"/"build" should be reliable.
- [ ] Repo structure created
  - [x] `packages/engine`
  - [x] `apps/web`
  - [ ] `packages/ui` (optional; can come later)

---

## 1) Planning Doc (Source of Truth)

- [x] Keep `v_cell_rebuild_plan.md` updated as decisions get locked
- [ ] Add any remaining rule clarifications as they arise
- [ ] Keep a “Decision Log” section (date + what changed) (optional but nice)

---

## 2) Engine Package Scaffolding (`packages/engine`)

- [x] `packages/engine/package.json` set up (build/test scripts)
- [x] Install dev deps (typescript, vitest, tsup)
- [x] Add `tsconfig.json` (dev)
- [x] Add `tsconfig.build.json` (build output)
- [x] Add `src/index.ts` (public exports only)
- [x] Add Vitest smoke test (pipeline sanity)
- [x] Add test runner config if needed (vitest defaults often fine)

### 2.2 Engine Types (Contract)

- [x] Add core types
  - [x] `Rules` (faceDownCount 0/7/14/21, allowFoundationPullback, undoLimit)
  - [x] `Card`, `TableauCard(faceDown)`
  - [x] `PileRef` (foundation by slot index)
  - [x] `FoundationSlot` (suit null until Ace, cards[])
  - [x] `Move` union
  - [x] `GameState`
  - [x] Clarify tableau ordering (TOP→BOTTOM array; exposed card is last element)

### 2.3 Core Engine Functions (Pure)

- [x] `createGame(seed, rules)`
  - [x] createGame function scaffold exists
  - [x] shuffleInPlace utility exists (Fisher–Yates)
  - [x] deterministic shuffle
  - [x] deal 49 to tableau, 3 to free cells
  - [x] apply V-shape face-down layering
- [x] `getLegalMoves(state)`
  - [x] tableau stack moves
  - [x] moves to free cells / foundations
  - [x] kings-only into empty tableau columns
  - [x] dynamic foundation suit logic
  - [x] foundation pullback rules
- [x] `applyMove(state, move)`
  - [x] enforce legality (or assume legal + assert in dev)
  - [x] update state
  - [x] auto-flip when face-down becomes exposed
  - [x] foundation suit set/unset rules
- [x] Derived helpers
  - [x] `getMovableRunLengths(state)` (internal helper; not exported in public engine contract)
  - [x] `areAllCardsUnlocked(state)` (true when no locked tableau cards remain)
  - [x] `isWin(state)` (delegates to `areAllCardsUnlocked`)
  - [x] `getAutoCompleteMoves(state)` (safe deterministic sequence)
- [x] **Tableau stack legality, stack slicing, and auto-flip behavior are fully implemented and verified by tests.**

### 2.5 Engine Guardrails (Dev Assertions)

- [x] `applyMove` asserts the provided move is legal (via `getLegalMoves`) in dev/test
- [x] `applyMove` validates moved tableau stacks are internally valid (alternating colors + descending ranks, no face-down cards)
- [ ] Confirm error messages are stable enough for debugging (not a public API guarantee)

### 2.4 Engine Test Strategy

- [x] Determinism tests
  - [x] same (seed,rules) => identical board
- [x] Invariant tests
  - [x] all 52 unique cards present exactly once
  - [x] correct counts in tableau/freecells/foundations
  - [x] faceDownCount matches rules (0/7/14/21)
- [x] Legality tests
  - [x] getLegalMoves: single-card moves + pullback behavior
  - [x] kings-only empty columns
  - [x] tableau stack validity
  - [x] foundation slot suit locking/unlocking
  - [x] pullback only top card and allowed destinations
- [x] Apply-move correctness tests
  - [x] tableauStack slice + order correctness
  - [x] tableauStack auto-flip when newly exposed
  - [x] auto-flip behavior
  - [x] move results stable and predictable
- [x] **Stack-move legality and run semantics are now covered by regression tests.**

---

## 3) Web App Scaffolding (`apps/web`)

- [x] Create Next.js app (App Router)
- [x] Install and link `@vcell/engine`
- [x] App layout + routing (initial)
- [x] Basic game screen skeleton with engine wiring + debug JSON
- [x] Add route structure: / and /game (done)
- [x] Add route structure: /settings and /stats (placeholders first)
- [x] Landing flow: choose guest vs login (minimal session model)
- [x] /stats renders for guests but shows a login prompt instead of redirecting
- [x] MVP /login route + session persistence (local-only; real auth later)
- [x] Navbar (global) with Login/Logout + route links
- [x] Navbar responsive behavior (mobile open/close, active link styling, hamburger morph)
- [x] ThemeProvider + SessionProvider both hydration-safe (no SSR localStorage reads; client-only hydrate flag)
- [x] Hydration-safe SessionProvider (no SSR localStorage reads; client-only hydrate flag)
- [ ] Decide leaderboards scope + privacy model (later): public leaderboard page, what stats are shared, and whether users can view each other’s profiles

---

- [x] Move GameProvider out of page components into a dedicated module
- [x] Provide GameProvider at app scope (shared across routes)
- [x] Provide SessionProvider at app scope (guest vs user; persisted locally)
- [x] Render all zones from engine state
  - [x] Foundations extracted into presentational component
  - [x] Tableau extracted into presentational component
  - [x] Free cells extracted into presentational component
- [ ] Card stacking + layout
  - [x] Card backs: branded V-Cell logo back (PNG), recolored for Times Light/Dark
  - [x] Board layout: foundations on top, free cells on bottom (V1-inspired)
  - [x] All zones share the same 7-column rhythm (no placeholder “unused” slots rendered)
  - [x] Overlap/stacking in tableau columns (vertical offset as % of card height)
  - [x] Z-index/stacking-context strategy (avoid filter/opacity creating new stacking contexts; ensure dragged/selected cards sit on top)
  - [ ] Click targets + hit-testing regions (prep for drag/drop + keyboard)
  - [ ] Introduce move history stack in GameProvider (record applied moves + prior GameState snapshots) to enable Undo
  - [ ] Align board layout with V1: nav/board/controls (landscape) and stacked layout (portrait)
  - [ ] Visually distinguish: empty slot vs face-down vs face-up (per-theme)
  - [ ] Visually distinguish: face-up playable vs face-up locked (per-theme)
  - [ ] Define and wire a single source of truth for “playable” (engine mask → UI)
  - [ ] Add tests for engine playable mask helper (getPlayableMask)
  - [x] Timer UI (web): show/hide toggle wired from Settings → Game UI
    - [x] Persist `showTimer` preference locally (ThemeProvider-style) and later sync to user profile
    - [x] Ensure timer container sets `aria-hidden` when hidden
- [ ] Decide state boundaries: keep engine state global; keep per-page UI state local
- [x] Card components + pile components (initial extraction)
- [ ] Continuous scaling system (single scale factor)

  - [x] Aspect-ratio constraints for board container (target 3:4; clamp max width/height)
  - [x] Theme system (CSS variables, `data-theme`)
  - [x] Theme system foundation (CSS variables, semantic tokens, `data-theme`; Poker default; Times Light/Dark next)
  - [x] Card sizing: card width derived from 7-column board; height follows 3:2 ratio
  - [ ] Clamp + scale: confirm consistent vertical spacing ratios (stack offset as % of card height)
  - [ ] Accessibility baseline: make the game fully playable by keyboard (tab focus, arrow navigation, pick up/drop, shortcuts)
  - [ ] Accessibility baseline: visible focus styles and ARIA labels for piles/cards/buttons
  - [ ] Accessibility baseline: ensure stacked cards remain individually focusable (roving tabindex or equivalent)
  - [ ] Keyboard play is a first-class requirement (design focus/move-intent model now so we don’t retrofit later)
  - [ ] Define keyboard interaction spec (later): focus model, pick-up/drop intent, shortcuts, and screen reader announcements
  - [ ] Keyboard spec + implementation should include a “pick up stack” affordance aligned with the engine’s movable run definition

- [x] Drag a single playable card around the screen (MVP), snapping back on release
- [x] Centralized drag state via `useTableauDrag` hook (Board-owned)
- [x] Drag single card from tableau → tableau
- [x] Drag single card from tableau → free cell
- [x] Drag single card from tableau → foundation
- [x] Drag single card from free cell → tableau
- [x] Drag single card from free cell → foundation
- [x] Foundation slots render as persistent empty slots (2-layer render)
- [x] Centralized drag state supports multiple source types (tableau, free cell)
- [x] “Slide back” animation on release (no lag while dragging; transition only after mouseup/touchend)
- [ ] Smooth return animation for invalid drops
- [ ] Highlight valid drop targets during drag
- [x] Drag/drop for single card + sub-stack
- [x] Double-click/double-tap auto-send to foundation
- [x] deterministic foundation slot selection if multiple valid
- [x] Extract board drop-resolution logic into hooks (useBoardDrop)
- [x] Extract auto-foundation logic into hook (useAutoFoundation)
- [x] Board.tsx reduced to layout + wiring (no embedded game rules)
- [ ] Magnetic snapping (snap radius + target priority)
- [ ] Valid target highlighting
- [ ] Double-click/double-tap auto-send to foundation
  - [ ] deterministic foundation slot selection if multiple valid

### 4.3 Animation

- [ ] Move animations (drop, slide, lift)
- [ ] Auto-complete animation sequence
- [ ] Win celebration (confetti / flourish)
- [x] Mobile nav polish: hamburger icon morph (≡ → ✕) + smooth open/close transition
- [ ] Replace win alert with a real win celebration UI (modal / animation)

---

## 5) Offline Support (PWA)

- [ ] Fix dev 404 for /sw.js (either add a stub SW or disable any SW registration until we actually do PWA)
  - [ ] If we are not doing PWA yet, remove/disable any service worker registration so dev stays clean
- [ ] Decide whether we’re doing PWA via next-pwa or a custom service worker (don’t half-register it)
- [ ] Add PWA support (service worker + caching strategy)
- [ ] Confirm: app loads offline, play works offline
- [ ] Store queued stats locally while offline
- [ ] Sync queued stats when online returns

---

## 6) Auth + User Profile (Cross-Device)

- [ ] Choose backend (Firebase vs Supabase vs custom)
- [ ] Auth
  - [ ] Google sign-in
  - [ ] Email/password fallback
  - [ ] Account linking strategy (avoid split stats)
- [ ] Guest mode support (no account required; gate stats/leaderboards behind login)
- [ ] Add minimal session mode first (guest vs user) + route gating for /stats (before real auth)
- [ ] User profile fields
  - [ ] theme, showTimer, knowsHowToPlay, soundOn
  - [ ] undoLimitDefault, faceDownCountDefault, allowFoundationPullbackDefault
- [ ] Define public profile scope (later): what fields exist, what’s public vs private, and whether profiles are viewable by other users
- [ ] Leaderboards (later): global + friends, filters by rules, and anti-cheat / integrity plan

---

## 7) Stats Model + Sync (Logged-in only)

- [ ] Per-game record format (includes settings used)
- [ ] Aggregates (wins, total, abandons, best time, streaks)
- [ ] Filtering/sorting by settings in UI (later phase)
- [ ] Offline-first syncing + conflict-safe merges
- [ ] Decide which stats can be shared publicly (leaderboards) vs private-only (per-user history)

---

## 8) V1 → V2 Import

- [ ] Finalize `sanitizeV1Export()` implementation location
- [ ] Import UI flow in V2
- [ ] Write targets
  - [ ] `users/{uid}/profile`
  - [ ] `users/{uid}/games/{gameId}` (legacyImported)
  - [ ] `users/{uid}/stats` (legacyImported)
  - [ ] idempotency using `importId`
- [ ] Test with your V1 JSON snapshot(s)

---

## 9) Hints + Winnable Pools (Later Phase)

- [ ] Phase 1: heuristic hints (rank moves)
- [ ] Phase 2: shallow lookahead
- [ ] Phase 3: solver-backed (optional)
- [ ] Winnable seed pool strategy (beaten seeds first)

---

## 9A) Web App Polish (Early)

- [x] Navbar responsive behavior (mobile open/close, active link styling, layout)
- [x] Theme switching + prefers-color-scheme mapping (Poker default; OS dark => Times Dark)
- [x] Theme switcher UI in Navbar (select control)
- [x] ThemeProvider lint/type issues resolved (no setState-in-effect warnings; no implicit any; media-query listener types)
- [x] Add tests for engine playable mask helper (getPlayableMask)
- [x] Hydration safety pass for session/localStorage (fixed SSR mismatch + localStorage on server issues)
- [ ] Add "check" script for web package (tsc --noEmit + lint) and wire into root scripts (so root "npm run check" is reliable)
- [x] Settings → Timer toggle wired into Game UI (incl. aria-hidden)
- [ ] Store background assets locally (move remote background image into repo under `public/` and document the convention + CSS URL syntax)
  - [ ] Eliminate redundant color vars; introduce semantic tokens (Poker/default alias; Times Dark aligns with OS dark; add `--muted` and other semantic tokens once)
  - [ ] Select chevron styling: ensure it remains visible on hover and uses theme token (e.g. `--foreground`)
  - [ ] SVG suit icons: confirm a scalable sizing strategy (prefer `em`/`currentColor` where possible) and document the convention

## 10) Release Checklist

- [ ] Smoke test on desktop + mobile
- [ ] Offline airplane-mode test
- [ ] Migration import test (dad + girlfriend)
- [ ] Deploy (Netlify/Vercel/etc.)
- [ ] Add “Export V1 Stats” button to V1 site
- [ ] Add “Import V1 Stats” in V2

---

## Recently completed

- Wired the web app to the engine and verified the app loads with a deterministic dev seed.
- Split routing so the landing page (/) and gameplay (/game) are separate pages.
- Moved the GameProvider out of the page file and hoisted it to app scope.
- Added a minimal SessionProvider (guest vs user) persisted locally (no real auth yet).
- Added MVP /login + navbar with Login/Logout links.
- Added /stats page that renders for guests but shows a login prompt instead of redirecting.
- Rendered foundations + tableau + free cells in the new board layout (foundations top, free cells bottom).
- Implemented theme selection plumbing (ThemeProvider) and applied Poker as default + Times Dark for OS dark.
- Centralized win detection in the engine and exposed it via GameProvider as `isWon`.
- Refactored Board.tsx to delegate move commitment and auto-foundation behavior to dedicated hooks.
- Confirmed V-Cell win condition as unlocking all tableau cards (foundation completion is cosmetic).
