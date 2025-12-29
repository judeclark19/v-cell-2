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
```

## Monorepo Layout

- `packages/engine` — Pure TypeScript game engine (no UI, no DOM)
- `apps/web` — Next.js web app (UI)
- Route plan (web): / (entry), /game (play), /settings (preferences), /stats (history/leaderboards; login required)
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

- `/` — Entry / mode selection (Guest vs Login) (in progress)
- `/game` — Gameplay (engine wiring + debug panel currently)

Planned next: `/settings`, `/stats` (logged-in only).

Note: game state is provided at **app scope** via a `GameProvider`, so it can be shared across routes.

## Engine Philosophy

- Pure, deterministic, and UI-agnostic core logic
- All game rules and state transitions are handled in the engine package
- The engine can be tested and used independently of any frontend

## Guest vs Logged-in

The intended product behavior is:

- Guests can play the game and change local settings.
- Stats, play history, and leaderboards require login.

We’ve started the entry flow on `/`. Next up is adding a simple “session mode” gate (guest vs user) before real auth, then hardening it once auth exists.
