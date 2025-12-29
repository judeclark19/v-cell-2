# V-Cell V2 — Project TODO (High-Level)

This is the end-to-end checklist for rebuilding V-Cell as a clean monorepo with a pure TS engine, a web app UI, offline-first support, and account-based stat sync. We’ll break items down further as we reach them.

**Code phrase:** When I say **“update documentation”**, please review and propose edits to `todo.md`, `v_cell_rebuild_plan.md`, and `README.md` based on current repo state.

---

## 0) Repo + Tooling Baseline

- [x] Root `.gitignore` (node_modules, dist, env files, etc.)
- [x] Decide package manager (npm vs pnpm vs yarn) and stick to it - decided npm
- [x] TypeScript node environment sanity (ensure `console` is typed via `@types/node` and tsconfig `types: ["node"]`)
- [ ] Monorepo setup (workspaces)
  - [ ] Root `package.json` with workspaces: `packages/*`, `apps/*`
  - [ ] Root tooling scripts (lint/test/build hooks later)
- [ ] Repo structure created
  - [x] `packages/engine`
  - [ ] `apps/web`
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

- [ ] Create Next.js app (App Router)
- [ ] Install and link `@vcell/engine`
- [ ] App layout + routing
- [ ] Basic game screen skeleton with placeholder rendering

---

## 4) UI + Interaction (Feel)

### 4.1 Rendering

- [ ] Render tableau/free cells/foundations from engine state
- [ ] Card components + pile components
- [ ] Continuous scaling system (single scale factor)
- [ ] Theme system (CSS variables, `data-theme`)

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

---

## 5) Offline Support (PWA)

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
- [ ] User profile fields
  - [ ] theme, showTimer, knowsHowToPlay, soundOn
  - [ ] undoLimitDefault, faceDownCountDefault, allowFoundationPullbackDefault

---

## 7) Stats Model + Sync

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

## 10) Release Checklist

- [ ] Smoke test on desktop + mobile
- [ ] Offline airplane-mode test
- [ ] Migration import test (dad + girlfriend)
- [ ] Deploy (Netlify/Vercel/etc.)
- [ ] Add “Export V1 Stats” button to V1 site
- [ ] Add “Import V1 Stats” in V2
