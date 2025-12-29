# V-Cell V2

V-Cell V2 is a modern rebuild of the V-Cell solitaire game, with a focus on correctness, feel, and extensibility. The core engine is implemented as a pure, deterministic, and UI-agnostic TypeScript package, enabling robust testing and separation from the web UI.

## Monorepo Layout

- `packages/engine` — Pure TypeScript game engine (no UI, no DOM)
- `apps/web` — Web application (React-based UI)
- `todo.md` and `v_cell_rebuild_plan.md` — living project checklist + decisions (kept in sync)

## Running Engine Tests

To run the engine's test suite:

```sh
cd packages/engine
npm test
```

The engine’s **public API** is exported from `packages/engine/src/index.ts`. Helpers used only for UI conveniences should stay internal unless we intentionally promote them to contract.

## Engine Philosophy

- Pure, deterministic, and UI-agnostic core logic
- All game rules and state transitions are handled in the engine package
- The engine can be tested and used independently of any frontend
