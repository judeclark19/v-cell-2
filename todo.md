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
  - [ ] Root tooling scripts (dev/test/check/build entrypoints for web + engine) — still needed; right now we run via workspace scripts
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
  - [x] `areAllCardsExposed(state)`
  - [x] `isWin(state)` (win when all exposed)
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
- [x] Hydration-safe SessionProvider (no SSR localStorage reads; client-only hydrate flag)

---

## 4) UI + Interaction (Feel)

- [x] Move GameProvider out of page components into a dedicated module
- [x] Provide GameProvider at app scope (shared across routes)
- [x] Provide SessionProvider at app scope (guest vs user; persisted locally)
- [ ] Render tableau/free cells/foundations from engine state (in progress — basic rendering + scaling underway)
- [ ] Decide state boundaries: keep engine state global; keep per-page UI state local
- [ ] Card components + pile components
- [ ] Continuous scaling system (single scale factor)
  - [x] Aspect-ratio constraints for board container (target 3:4; clamp max width/height)
  - [x] Theme system (CSS variables, `data-theme`)
  - [x] Theme system foundation (CSS variables, semantic tokens, `data-theme`; Poker default; Times Light/Dark next)
  - [ ] Accessibility baseline: make the game fully playable by keyboard (tab focus, arrow navigation, pick up/drop, shortcuts)
  - [ ] Accessibility baseline: visible focus styles and ARIA labels for piles/cards/buttons
  - [ ] Keyboard play is a first-class requirement (design focus/move-intent model now so we don’t retrofit later)

### 4.2 Input

- [ ] Drag/drop for single card + sub-stack
- [ ] Magnetic snapping (snap radius + target priority)
- [ ] Valid target highlighting
- [ ] Double-click/double-tap auto-send to foundation
  - [ ] deterministic foundation slot selection if multiple valid

### 4.3 Animation

- [ ] Move animations (drop, slide, lift)
- [ ] Auto-complete animation sequence
- [ ] Win celebration (confetti / flourish)
- [x] Mobile nav polish: hamburger icon morph (≡ → ✕) + smooth open/close transition

---

## 5) Offline Support (PWA)

- [ ] Fix dev 404 for /sw.js (either add a stub SW or disable any SW registration until we actually do PWA)
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

---

## 7) Stats Model + Sync (Logged-in only)

- [ ] Per-game record format (includes settings used)
- [ ] Aggregates (wins, total, abandons, best time, streaks)
- [ ] Filtering/sorting by settings in UI (later phase)
- [ ] Offline-first syncing + conflict-safe merges

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
- [ ] Theme switching + prefers-color-scheme mapping (Poker default; OS dark => Times Dark)
- [x] Hydration safety pass for session/localStorage (fixed SSR mismatch + localStorage on server issues)
- [ ] Add "check" script for web package (tsc --noEmit + lint) and wire into root scripts
- [ ] Store background assets locally (move remote background image into repo and reference via Next public/ or import)
- [ ] Eliminate redundant color vars; introduce semantic tokens (e.g., Poker/default alias; Times Dark aligns with OS dark)

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
- Added /stats placeholder that prompts guests to log in instead of redirecting.
