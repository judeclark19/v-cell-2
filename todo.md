# V-Cell V2 — TODO (Source of Truth)

This is the end-to-end checklist for rebuilding V-Cell as a clean monorepo with a pure TS engine and a web UI that supports mouse + full keyboard play. We treat “unlocking the tableau” as the win condition; foundation completion is cosmetic (auto-complete).

**Doc workflow:** When I say **“update documentation”**, update `todo.md`, `v_cell_rebuild_plan.md`, and `README.md` to match the current repo reality.

---

## A) Foundations: Repo + Tooling

### A1) Monorepo baseline

- [x] Root `.gitignore`
- [x] npm workspaces (`packages/*`, `apps/*`)
- [x] Workspace installs and local linking working

### A2) Root scripts (still needed)

- [ ] Root `npm run dev` runs web (and watches engine if needed)
- [ ] Root `npm run check` runs lint + typecheck (web + engine) reliably
- [ ] Root `npm run build` builds engine + web reliably

---

## B) Engine (`packages/engine`) — Pure TS rules + tests

### B1) Core types / contract

- [x] Core types: `Rules`, `Card`, `TableauCard`, `FoundationSlot`, `Move`, `GameState`
- [x] Rule flags: `faceDownCount`, `allowFoundationPullback`, `undoLimit`
- [x] Tableau ordering defined (TOP→BOTTOM array; exposed card is last element)

### B2) Core functions

- [x] `createGame(seed, rules)` deterministic dealing + V-layering
- [x] `getLegalMoves(state)` (tableau/freecell/foundation; kings-only empty columns; pullback rules)
- [x] `applyMove(state, move)` correctness + auto-flip + foundation suit logic
- [x] Derived helpers:
  - [x] `areAllCardsUnlocked(state)` (win condition)
  - [x] `isWin(state)` delegates to unlock condition
  - [x] `getAutoCompleteMoves(state)` deterministic cosmetic completion

### B3) Guardrails + tests

- [x] Determinism tests + invariants + legality tests + apply-move correctness
- [x] Dev assertions: illegal moves fail fast (via `getLegalMoves`) in dev/test
- [ ] Error messaging sanity (debuggability; not a public API guarantee)

---

## C) Web App (`apps/web`) — Gameplay MVP

### C1) App shell

- [x] Next.js App Router scaffold
- [x] Routes: `/`, `/game`, `/settings`, `/stats`, `/login` (minimal)
- [x] Navbar (responsive)
- [x] Theme system (Poker / Times Light / Times Dark) hydration-safe
- [x] Session model (guest vs user) local-only for now

### C2) GameProvider (single source of truth)

- [x] GameProvider hoisted to app scope
- [x] Engine state wired into UI
- [x] Undo stack exists and can undo via keyboard (`U`)
- [x] Rules/preferences state wired:
  - [x] Show timer (settings → UI)
  - [x] Allow foundation pullback (settings → UI + drag guards)

### C3) Board layout + rendering

- [x] Board layout: foundations top, free cells bottom (7-column rhythm)
- [x] Foundations / FreeCells / Tableau extracted into components
- [x] Card stacking / offsets / z-index strategy stable
- [x] Face-down vs face-up vs empty slot visual distinction (theme aware)
- [ ] Continuous scaling system (single scale factor; clamp + spacing ratios)

---

## D) Input: Mouse + Drag/Drop

### D1) Drag/drop core (DONE)

- [x] Drag single card and sub-stack
- [x] Tableau ↔ tableau
- [x] Tableau ↔ free cell
- [x] Tableau ↔ foundation
- [x] Free cell ↔ tableau / foundation
- [x] Foundation pullback ↔ tableau / free cell (respect rules)
- [x] Drag overlay behavior: immediate on pointer-down
- [x] Slide-back transition (transition only after release)

### D2) Drag/drop polish (NEXT)

- [ ] Highlight valid drop targets during drag
- [ ] Smooth return animation for invalid drops
- [ ] Magnetic snapping (snap radius + target priority)
- [ ] Hit-testing/click-target refinements (touch friendliness)

---

## E) Input: Keyboard (Core Play)

Keyboard is treated as a first-class control scheme (not “bonus accessibility”).

### E1) Navigation + focus (DONE)

- [x] Tab/Shift+Tab enter/leave the board
- [x] Arrow keys navigate within the board
- [x] Clicking inside the board focuses:
  - [x] clicked playable card, or
  - [x] first playable card if clicking non-playable area
- [x] Focus styles visible on `:focus` and `:focus-visible`
- [x] Hover never suppresses keyboard focus/target visuals

### E2) Carry mode + commit (DONE)

- [x] Space toggles carry mode
- [x] Escape cancels carry mode and clears visuals
- [x] Carry cancels when focus leaves the board
- [x] Targets are highlighted only while carrying
- [x] Empty slots are targets only while carrying
- [x] Enter commits drop to focused target
- [x] Tableau→tableau commit is direction-agnostic (“either direction”)

### E3) Shortcut actions (DONE / IN PROGRESS)

- [x] `F` = attempt auto-foundation from focused playable card
- [x] `C` = attempt auto-free-cell from focused playable card
- [x] `U` = undo; focus restores to moved card when possible
- [ ] `P` = pause toggle (must suspend timer + disable input while paused)
- [ ] `N` = new deal (random seed 1–800) without hydration issues

### E4) Keyboard interaction spec (needs a single checklist)

- [ ] Define focus model (idle vs carrying; what is focusable)
- [ ] Define arrow-key symmetry expectations (up/down should reverse when possible)
- [ ] Failure feedback:
  - [ ] invalid drop feedback
  - [ ] no-op feedback when F/C has no legal moves
- [ ] Screen reader announcements (ARIA live region):
  - [ ] carry start/end
  - [ ] move committed (source → destination)
  - [ ] undo
- [ ] Reduced motion support:
  - [ ] transitions respect prefers-reduced-motion
  - [ ] no “theme flash” or transition bloom during carry/targets

---

## F) Timer + Pause

### F1) Timer logic (DONE)

- [x] Timer measures active play time only (not wall-clock elapsed)
- [x] Timer starts on first committed move (not on deal / load)
- [x] Timer stops when tab inactive
- [x] Timer stops while paused
- [x] Timer display (mm:ss) in Foundations
- [x] Show/hide timer setting wired and persisted locally

### F2) Timer/pause polish (NEXT)

- [ ] Timer should appear muted before first move
- [ ] Pause button disabled before first move
- [ ] Pause overlay UX (board-border sized; close button; keyboard accessible)

---

## G) Win condition + Auto-complete

Win condition is: **no locked tableau cards remain**. Foundations are cosmetic.

- [x] Win logic implemented in engine (`areAllCardsUnlocked`)
- [ ] Auto-complete button appears when tableau fully unlocked
- [ ] Auto-complete runs cosmetic completion (send tableau cards to foundations)
- [ ] Auto-complete optional (player can keep manually playing)

---

## H) Visual polish + Theme correctness

- [x] Theme tokens + semantic tokens exist; kb highlight uses semantic token
- [ ] Fix Times Dark “flash of wrong colors” on page refresh (board-only)
- [ ] Ensure new deal/restart suppresses flip/transition animations
- [ ] Ensure disabled foundation pullback shows `cursor: not-allowed` and blocks pointerdown consistently

---

## I) Offline Support (Later)

- [ ] Decide: next-pwa vs custom service worker
- [ ] Remove/disable any accidental SW registration until chosen (avoid dev 404s)
- [ ] Offline play works; stats queue while offline; sync later

---

## J) Auth + Profile + Stats (Later)

### J1) Auth

- [ ] Choose backend (Firebase vs Supabase vs custom)
- [ ] Real login (Google, email/password)
- [ ] Guest mode remains supported

### J2) Profile settings sync

- [ ] theme, showTimer, knowsHowToPlay, soundOn
- [ ] defaults for rules (undoLimit, faceDownCount, allowFoundationPullback)

### J3) Stats + leaderboards

- [ ] Per-game records
- [ ] Aggregates + best times
- [ ] Privacy model + leaderboard scope

---

## Recently Completed (keep short + factual)

- Engine rules + tests stabilized; win condition is tableau unlock.
- Full drag/drop implemented for single cards and sub-stacks across tableau/free cells/foundations (including pullback when enabled).
- Keyboard play MVP implemented: arrow navigation, carry mode, target highlighting, Enter commit, and F/C/U shortcuts.
- Timer measures active play time only and starts on first move; show/hide preference wired.
- Board logic refactored into feature hooks/modules; layout mostly wiring-only.
