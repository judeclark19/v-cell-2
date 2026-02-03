# V-Cell V2 (Web)

Next.js app for the V-Cell V2 UI.

- Engine lives in `packages/engine` (pure TypeScript).
- Web app lives in `apps/web` (rendering, input, animations, persistence).

## Development

From repo root:

```bash
pnpm dev
```

Then open http://localhost:3000.

## Scripts

From repo root:

```bash
pnpm dev        # start dev server
pnpm test       # run tests (all workspaces)
pnpm lint       # lint (all workspaces)
```

## Persistence (Quick Notes)

- **localStorage** is used for small settings (theme, gameplay knobs).
- **IndexedDB** is intended for history and larger records (completed games, stats queue).

The canonical architecture/spec lives in `v_cell_rebuild_plan.md` at repo root.
