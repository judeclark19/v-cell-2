# V-Cell V2

V-Cell V2 is a modern rebuild of the V-Cell solitaire game, focused on correctness, feel, and long-term extensibility.

The project is split cleanly into:

- a **pure, deterministic TypeScript engine** (rules, legality, move generation)
- a **Next.js web app** (rendering, input, animation, persistence)

The engine is UI-agnostic and fully testable in isolation. All interaction semantics, animation, and persistence live in the web layer.

## Install (Monorepo)

From the repo root:

```sh
npm install
```

This repo uses **npm workspaces** (`packages/*`, `apps/*`).

Handy workspace commands (from repo root):

```sh
# Run engine tests
npm -w @vcell/engine test

# Build engine (when we add a real build output)
npm -w @vcell/engine run build

# Run the web app
npm -w @vcell/web dev

# Lint + typecheck (web)
npm -w @vcell/web lint
npm -w @vcell/web typecheck

# Run everything (root scripts are still being finalized)
npm run check
```

## Monorepo Layout

- `packages/engine` — Pure TypeScript game engine (no UI, no DOM, fully deterministic)
- `apps/web` — Next.js web app (UI, input, animation, persistence)
- `v_cell_rebuild_plan.md` — Living architecture + design decisions (source of truth)
- `todo.md` — Short-term task tracking

## Running Engine Tests

To run the engine's test suite:

```sh
cd packages/engine
npm test
```

The engine’s **public API** is exported from `packages/engine/src/index.ts`. Helpers used only for UI conveniences should stay internal unless we intentionally promote them to contract.

## Running the Web App

```sh
cd apps/web
npm run dev
```

Note: current gameplay is fully functional via mouse and keyboard. Outstanding work is focused on UI polish (autocomplete affordances, win-state presentation, and final animation tuning), not on core rules or legality.

## Persistence (Current State)

Persistence is handled entirely in the web app.

- **localStorage**
  - small user preferences (theme, gameplay settings, UI flags)
  - session mode (guest vs user)

- **IndexedDB (planned / partially implemented)**
  - completed game history
  - per-game metadata (seed, duration, result)
  - future stats sync queue

All persisted data is versioned and written behind adapter-style helpers so the engine remains pure.

## Current Web Routes

- "/" — Entry (if session unset: entry flow; otherwise redirects to /game)
- "/login" — MVP login (sets session mode; real auth later)
- "/game" — Gameplay (engine wiring + board rendering + MVP drag + timer UI)
- "/settings" — Settings skeleton (gameplay + appearance; wiring in progress)
- "/stats" — Renders for guests but shows a login prompt; real stats + leaderboards later

## Leaderboards & Profiles (Later)

Leaderboards are a real “scope multiplier.” We’ll treat them as a later phase after core gameplay UI and stats syncing are solid. When we do them, we’ll need to decide what stats are public, whether users have viewable profiles, and what privacy defaults apply.

Note: game state is provided at **app scope** via a `GameProvider`, so it can be shared across routes.

## Engine Philosophy

- Pure, deterministic, and UI-agnostic core logic
- All game rules and state transitions are handled in the engine package
- The engine can be tested and used independently of any frontend
- UI layers may temporarily diverge from engine state for visual feedback during interactions (e.g. hiding a dragged foundation card), but engine state is never mutated until a move is committed
- Difficulty toggles (e.g. foundation pullback) are enforced first in the engine and mirrored in the UI purely for affordance and feedback.
- Keyboard interaction semantics (navigation, carry/drop, auto-moves) are implemented entirely in the UI layer and always resolve through engine-generated legal moves; the engine has no concept of input modality.

## Guest vs Logged-in

The intended product behavior is:

- Guests can play the game and change local settings.
- Stats, play history, and leaderboards require login.

We’ve implemented a minimal local-only “session mode” (guest vs user) to shape routing and UI gates. Next up is replacing this with real auth while keeping the same SessionProvider contract.

## Themes (Early)

Poker is the current default theme. Times Light and Times Dark are planned; Times Dark should also apply automatically when the OS prefers dark mode (prefers-color-scheme: dark). Theme selection is driven by CSS variables + a root data-theme attribute.
Theme can also be changed via a select control in the Navbar (wired to ThemeProvider context). The default is Poker; OS dark mode maps to Times Dark.

## Gameplay Model (Current Truth)

V-Cell V2 is a rules-correct solitaire variant built around unlocking the tableau, not filling the foundations.

**Win condition**  
The game is won when all tableau cards are unlocked (i.e. no locked cards remain).  
Foundations are cosmetic once this condition is met.

When the tableau is fully unlocked, an optional Auto-Complete action becomes available. This will cosmetically send all remaining tableau cards to the foundations. The player may also choose to keep playing manually.

---

## Input & Interaction

V-Cell V2 treats keyboard and mouse as equal first-class inputs. The entire game is playable without a mouse.

### Mouse / Pointer Controls

- Click and drag:
  - Tableau ↔ tableau (single cards or valid stacks)
  - Tableau ↔ free cells
  - Tableau ↔ foundations
  - Free cells ↔ tableau / foundations
  - Foundation pullback ↔ tableau / free cells (when enabled)
- Invalid drops animate back to the source.
- During drag:
  - Valid drop targets are highlighted.
  - Foundation pullback is visually blocked when disabled (not-allowed cursor).

All move legality is enforced exclusively by the engine.  
The UI never invents or permits illegal moves.

---

## Keyboard Controls

Keyboard play is a complete control scheme, not an accessibility afterthought.

### Entering / Leaving the Board

- Tab / Shift+Tab — Enter or leave the board region
- Clicking inside the board:
  - Focuses the clicked playable card, or
  - Focuses the first playable card if empty board space is clicked

### Navigation

- Arrow Keys — Navigate spatially between playable cards and valid targets
- Navigation is symmetric:
  - Moving up then down returns to the original card whenever possible
  - Left/right always move to adjacent tableau columns (no column skipping)

### Carry Mode (Keyboard “Drag”)

- Space — Toggle carry mode
- Escape — Cancel carry mode
- While carrying:
  - Valid drop targets (including empty slots) are highlighted
  - Arrow keys navigate only between valid targets
  - Enter commits the drop
- Carry mode automatically cancels if focus leaves the board

Keyboard tableau-to-tableau drops are direction-agnostic: the player does not need to approach a target from a specific direction.

### Shortcut Actions

- Enter — Commit drop (while carrying)
- F — Attempt auto-move to foundation (deterministic via engine legal moves)
- C — Attempt auto-move to free cell
- U — Undo last move (focus restores to moved card when possible)
- P — Toggle pause
- N — Start a new deal (randomized seed, hydration-safe)

---

## Timer & Pause Behavior

The in-game timer measures active play time only.

- The timer:
  - Does not advance while the game is paused
  - Does not advance when the browser tab is inactive
  - Starts on the player’s first committed move, not on initial deal
- Restarting a deal does not reset the timer
- Timer visibility is a cosmetic UI preference

---

## Undo Model

Undo is implemented at the GameProvider / UI layer, not in the engine.

- The engine remains pure and stateless
- UI maintains a move history stack
- Undo:
  - Reverts the last committed move
  - Restores keyboard focus to the moved card when possible
- Foundation pullback undo respects current rule settings

---

## Engine ↔ UI Responsibilities

### Engine Responsibilities

- Game rules and legality
- Move generation
- Deterministic state transitions
- Difficulty toggles (e.g. foundation pullback)
- Win detection (all tableau cards unlocked)

### UI Responsibilities

- Rendering and animation
- Drag and keyboard affordances
- Keyboard navigation semantics
- Timer and pause behavior
- Undo history
- Visual feedback (hover, focus, carry, drop targets)

The UI may temporarily diverge visually (e.g. hiding a dragged foundation card), but engine state is never mutated until a move is committed.

---

## Accessibility & Reduced Motion

- All interactions are keyboard accessible
- Focus states are visually distinct from hover states
- Reduced-motion preferences are respected via CSS
- Keyboard focus and carry states use semantic color tokens rather than accent colors

---

## Project Status

- Core gameplay is feature-complete and rules-correct
- Mouse and full-keyboard play are implemented and polished
- Auto-complete and animation systems are in place

Current focus is shifting toward:

- persistence and stats (IndexedDB-backed history)
- backend-facing abstractions (session, stats queue)
- long-term support for auth and leaderboards

See `v_cell_rebuild_plan.md` for the authoritative roadmap.
