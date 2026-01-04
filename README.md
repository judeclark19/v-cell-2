# V-Cell V2

V-Cell V2 is a modern rebuild of the V-Cell solitaire game, with a focus on correctness, feel, and extensibility. The core engine is implemented as a pure, deterministic, and UI-agnostic TypeScript package, enabling robust testing and separation from the web UI.

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

# Typecheck / lint (scripts are still being standardized across workspaces)
npm -w @vcell/web run check

# Run everything from root
npm run check
```

## Monorepo Layout

- `packages/engine` — Pure TypeScript game engine (no UI, no DOM)
- `apps/web` — Next.js web app (UI)
- Route plan (web): / (entry), /login, /game (play), /settings (preferences), /stats (history; guests see a login prompt; leaderboards later)
- UI work-in-progress: foundations + tableau + free cells are rendering in a 7-column rhythm (foundations top, free cells bottom). Next: tableau overlap/stacking + drag/drop + keyboard controls. Move highlighting uses an engine-provided “playable” mask.
- `todo.md` and `v_cell_rebuild_plan.md` — living project checklist + decisions (kept in sync)

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

## Current Web Routes

- "/" — Entry (if session unset: entry flow; otherwise redirects to /game)
- "/login" — MVP login (sets session mode; real auth later)
- "/game" — Gameplay (engine wiring + early board rendering; tableau first)
- "/settings" — Settings skeleton (gameplay + appearance; wiring in progress)
- "/stats" — Renders for guests but shows a login prompt; real stats + leaderboards later

## Leaderboards & Profiles (Later)

Leaderboards are a real “scope multiplier.” We’ll treat them as a later phase after core gameplay UI and stats syncing are solid. When we do them, we’ll need to decide what stats are public, whether users have viewable profiles, and what privacy defaults apply.

Note: game state is provided at **app scope** via a `GameProvider`, so it can be shared across routes.

## Engine Philosophy

- Pure, deterministic, and UI-agnostic core logic
- All game rules and state transitions are handled in the engine package
- The engine can be tested and used independently of any frontend

Accessibility note: the web UI is planned to support full keyboard play (no-mouse gameplay), so UI state and move intent should be modeled in a way that supports both drag/drop and keyboard interactions.

## Guest vs Logged-in

The intended product behavior is:

- Guests can play the game and change local settings.
- Stats, play history, and leaderboards require login.

We’ve implemented a minimal local-only “session mode” (guest vs user) to shape routing and UI gates. Next up is replacing this with real auth while keeping the same SessionProvider contract.

## Themes (Early)

Poker is the current default theme. Times Light and Times Dark are planned; Times Dark should also apply automatically when the OS prefers dark mode (prefers-color-scheme: dark). Theme selection is driven by CSS variables + a root data-theme attribute.
Theme can also be changed via a select control in the Navbar (wired to ThemeProvider context).
