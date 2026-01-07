# V-Cell V2 — Rebuild Plan

## 1. Purpose

V-Cell V2 is a ground-up rebuild focused on **correctness, feel, and extensibility**. The core architectural goal is to separate the **game engine (rules + state)** from the **UI (rendering + interaction)** so that features like hints, undo limits, difficulty modifiers, offline play, and cross-device sync can evolve without destabilizing gameplay.

This document captures **decisions already made**, reorganized into a stable reference.

---

## 1A. Decision Log (Short)

- 2025-12: Engine contract stabilized and tested (createGame/getLegalMoves/applyMove + stack moves + auto-flip).
- 2025-12: Web app scaffolded with App Router routes: `/` and `/game`.
- 2025-12: `GameProvider` moved out of page components and hoisted to app scope so state can be shared across routes.
- 2025-12: Added minimal SessionProvider (guest vs user) persisted locally + MVP /login route.
- 2025-12: Added global navbar; /stats now renders for guests but prompts login instead of redirecting.
- 2025-12: Added responsive navbar (hamburger, active route styling) and basic theme foundation (Poker default).
- 2026-01: Added theme switching control in the Navbar (select) wired to ThemeProvider; OS dark maps to Times Dark.
- 2025-12: Implemented hydration-safe SessionProvider (client-only restore, avoids SSR/localStorage mismatches).
- 2026-01: Noted future scope: leaderboards likely imply a public stats/privacy policy and possibly viewable user profiles.
- 2026-01: Began board rendering in web UI; tableau is rendering first, with free cells + foundations next.
- 2026-01: Rendered foundations + tableau + free cells using a unified 7-column board rhythm (no placeholder slots).
- 2026-01: Began “playable vs locked” UI semantics using an engine-provided playable mask (styling + theme tokens in progress).
- 2026-01: Added Navbar theme control (select) wired to ThemeProvider context.
- 2026-01: Planned timer UI as a web-only feature (show/hide preference; local-first, sync later).
- 2026-01: Implemented early card interaction: draggable single playable cards (MVP) + snap-back on release; z-index/stacking context fixes for dragging.
- 2026-01: Wired Settings → Timer visibility into the Game UI (incl. aria-hidden for accessibility).
- 2026-01: Added branded card-back art (PNG) and recolored variants for Times Light/Dark themes.
- 2026-01: Decided to implement Undo via UI-level move history (GameProvider), not inside the engine, preserving engine purity.
- 2026-01: Refactored Board UI into presentational zone components (Foundations, Tableau, FreeCells) with Board as the single orchestrator; centralized drag logic extracted into `useTableauDrag` hook.
- 2026-01: Drag/drop architecture generalized — centralized drag logic now supports multiple source zones (tableau, free cells) and destination zones (tableau, free cells, foundations). Board owns move commitment; zone components remain presentational.
- 2026-01: Began Board orchestration refactor. Move-commitment logic (onDrop) and auto-foundation logic extracted into dedicated hooks. Win condition finalized as all tableau cards unlocked and centralized in the engine (areAllCardsUnlocked → isWin), with UI handling only side effects.

## 2. High-Level Architecture

### 2.1 Three-Part Repo Layout

**`packages/engine/`**\*\* — Game Engine (Pure TypeScript)\*\*

- All game rules and state transitions
- No React, no DOM, no browser APIs
- Deterministic, replayable, and fully testable

**`apps/web/`**\*\* — Web Application (Next.js)\*\*

- Renders game state
- Handles drag/drop, animation, accessibility
- Persists preferences and queues stats for sync

**`packages/ui/`**\*\* — UI Primitives (Optional)\*\*

- Shared components (Card, Pile, Modal)
- Design tokens (colors, spacing, typography)

### 2.2 App Routes (Web)

We have the first two routes in place, and the rest are planned:

- "/" — Entry (if session unset: show entry choices or redirect to /login; if set: redirect to /game)
- "/login" — MVP login (sets guest vs user; real auth later)
- "/game" — Gameplay (engine wired; early board rendering in progress — tableau first)
- "/settings" — Settings skeleton (gameplay + appearance); wiring and persistence in progress
- "/stats" — Stats/history shell; guests see a login prompt; leaderboards later

The engine remains UI-agnostic; routing and access control live in the web app.

---

## 3. Engine Contracts (Core API)

The engine exposes a small, stable API consumed by the UI:

- `createGame(seed, rules) → GameState`
- `getLegalMoves(state) → Move[]`
- `applyMove(state, move) → GameState`
- `areAllCardsUnlocked(state) → boolean`
- `getAutoCompleteMoves(state) → Move[]`
- `isWin(state) → boolean`

Everything below defines `GameState`, `Move`, and `Rules`.

---

## 4. Game Model

### 4.1 Deck

- Standard 52-card deck
- Deterministic shuffle using a seed

### 4.2 Deal-time face-down pattern (V-shape layering)

V-Cell supports `faceDownCount: 0 | 7 | 14 | 21`.

Pattern definition (7 columns indexed `0..6`):

- V depths (number of face-up cards above the first face-down card):
  - `[0, 1, 2, 3, 2, 1, 0]`

Layering rule:

- `layers = faceDownCount / 7` (0→0 layers, 7→1, 14→2, 21→3)
- For each tableau column `i`:
  - `start = depth[i]`
  - mark the next `layers` cards as face-down:
    - `tableau[i][start + 0]`, `tableau[i][start + 1]`, ...

Notes:

- Face-down cards are not movable.
- When a face-down card becomes the top of a column, it auto-flips immediately.

### 4.3 Board Zones

- **Tableau**: 7 columns × 7 cards (49 total)
- **Free Cells**: 5 total; game starts with 3 occupied
- **Foundations**: 4 slots (suit assigned dynamically when an Ace is placed)
- **Stock/Waste**: none

---

## 5. Move Rules (Confirmed)

### 5.1 Tableau → Tableau (Stack Moves)

- Any contiguous sub-stack may be moved
- Sub-stack must be internally valid:
  - Descending rank
  - Alternating colors

### 5.2 Single-Card Destinations

- **Foundations**: single card only
- **Free cells**: single card only

### 5.3 Empty Tableau Columns

- Only **Kings** may be placed

---

## 6. Foundations (Configurable)

- UI note: Foundation slots are always rendered as persistent empty targets; cards are layered above slots so dragging a foundation card never removes the visual drop target.

### 6.1 Build Rules (Dynamic foundation suit)

- There are **4 foundation slots** (not pre-assigned to suits).
- A foundation slot becomes **locked to a suit** only when an **Ace** is placed into an empty slot.
- After a slot is locked, it builds **Ace → King by that suit**.
- If foundation pullback is enabled and the last card is removed from a foundation slot, that slot becomes **unset** (`suit = null`) again.

### 6.2 Foundation Pullback (Difficulty Toggle)

- `allowFoundationPullback: boolean`
  - `false` (harder): foundations are final
  - `true` (easier): cards may be moved **out of foundations**
- Default for V2: `true` (users must opt into “harder” by turning it off).

Pullback legality (confirmed):

- Only the **top card** of a foundation slot may be moved
- Single-card moves only
- Destination may be **tableau** (if legal) **or a free cell** (if empty)
- If a pullback empties a foundation slot, that slot’s suit becomes `null` again

Affects legality, hints, and difficulty labeling.

---

## 7. Game Session Controls

### 7.1 Restart Deal

- Restart the current seed with identical rules

### 7.2 New Deal

- Generate a new seed

### 7.3 Abandon Tracking

- Starting a new deal mid-game records the current one as **abandoned**

### 7.4 Undo (Difficulty Toggle)

- Undo limits: `0 / 1 / 3 / 5 / unlimited`
- Implemented via deterministic history or replay
- Undo limit recorded as part of session rules

Implementation note (V2): Undo will be implemented in the web layer by recording a history of prior GameState snapshots (or reversible move records) whenever applyMove is called. The engine remains pure and stateless; undo availability and limits are enforced by the UI according to rules.undoLimit.

---

## 8. Interaction Philosophy

- Engine enforces legality
- UI guides users away from illegal actions
- Drag/drop supports:
  - Partial-stack pickup
  - Full-stack pickup
  - Magnetic snapping to valid targets
- Drag sources include tableau stacks and single free-cell cards (foundation cards next).
- UI validates drag intent exclusively via engine-provided legal moves.

Additional UX behavior (confirmed):

- **Double-click / double-tap** on a movable single card attempts to **auto-send to a foundation** if a legal foundation move exists.
  - If multiple foundation slots are valid targets (e.g., placing an Ace into any empty slot), choose deterministically (e.g., lowest slot index).
- A face-up card can still be inactive if there is an invalid break above the exposed card. The grabbable stack is the contiguous valid run from the exposed card upward.

UI semantics note: “playable” means “pick-up-able right now” (part of the current movable run in a tableau column, or a free-cell card). A face-up card can still be non-playable if the run is broken above the exposed card.

**Board orchestration model (confirmed)**

Board.tsx is an orchestration layer only. It wires engine state to presentational zones and coordinates drag intent, but does not contain game rules.

- Move selection and commitment live in extracted hooks (e.g. drop resolution, auto-foundation).
- Legality is always derived from engine legalMoves.
- Zone components (Tableau, FreeCells, Foundations) are render-only and never apply moves themselv

### 8.1 Accessibility (Keyboard Play)

V-Cell V2 should be fully playable without a mouse:

- Tab/Shift+Tab navigates between piles and actionable controls
- Arrow keys navigate within a pile (e.g., move focus up/down a tableau)
- Enter/Space picks up a card/stack; Enter/Space drops on a valid target
- Clear focus styles and ARIA labels for cards/piles

This is a product requirement (not a nice-to-have) and should be considered during UI architecture (focus management + move intent model).

Implementation note (engine):

- Tableau arrays are **TOP→BOTTOM**; the exposed card is the **last** element.
- `getMovableRunLength(column)` counts the contiguous _alternating-color, descending-rank_ run ending at the exposed card, moving upward.
- Stack moves (`tableauStack`) are only allowed when the moved slice is internally valid and contains **no face-down** cards.
- Note: `getMovableRunLengths` is an internal/UI-helper and is not part of the public engine contract.

Treat keyboard play as a core acceptance criterion for the web UI, not a later polish item.

Testing note: add dedicated engine tests for `getPlayableMask` so UI highlighting stays correct as rules evolve.

UI note: timer visibility already respects aria-hidden; keep that pattern for other hide/show UI controls.

---

## 9. Win, Auto-Complete, and Celebration

### 9.1 Primary Win Condition

- The game is **won when all tableau cards are unlocked** (i.e. no locked cards remain).
- Timer stops here; stats are recorded
- Implemented engine-side via areAllCardsUnlocked(state)
- Exposed as isWin(state)
- Foundation completion is cosmetic and not required for a win

### 9.2 Secondary Completion

- Optional: all 52 cards in foundations

### 9.3 Auto-Complete

- Offered once all cards are exposed
- User-triggered
- Engine provides deterministic move sequence

### 9.4 Win Animation

- UI-driven animation (e.g. Klondike-style send + celebration)

---

## 10. Layout & Themes

### 10.1 Continuous Scaling

- Board scales continuously with viewport/container
- Single scale factor drives:
  - Card size
  - Spacing
  - Hit-testing

### 10.1A Board Layout (V1-inspired)

Target layout behavior:

- Landscape viewports: three-column shell (Nav left, Board center, Controls right)
- Portrait viewports: stack these regions vertically (Nav, Board, Controls)
- Board area stays visually “portrait-ish” (target ~3:4 aspect) with sensible max width/height clamps
- In-board zones: foundations row at top, tableau in the middle, free cells row at bottom (all aligned to a 7-column rhythm)
- Card stacking/overlap in tableau: vertical offset should be expressed as a percentage of card height; be mindful of CSS stacking contexts (e.g., filter/opacity) when managing z-index
- Dragging must escape scroll/overflow regions (tableau) without clipping; if tableau scroll stays, dragged cards should temporarily render above it.

Implementation note: keep layout + scaling in CSS (tokens/variables) so themes can adjust spacing without rewriting components.

### 10.2 Themes

- Theme via CSS design tokens
- Applied with root attribute (e.g. `data-theme="midnight"`)
- Preference stored locally and optionally synced
  Implementation: ThemeProvider sets `data-theme` on the root element and persists selection locally; OS dark mode maps to Times Dark by default. Theme selection is also exposed via a Navbar select control.

Asset note: card-back art currently uses PNG variants (Poker / Times Light / Times Dark). We can later convert to SVG or generate via CSS if we want perfect scaling, but PNG is fine for MVP.

---

## 11. State Ownership

**Rule:** store only what cannot be reliably re-derived.

### 11.1 Engine State

- `seed`
- card placement
- rule flags
- optional move history

### 11.2 Client UI State (Ephemeral)

- drag state
- animations
- modals
- `canAutoComplete` (derived)

### 11.3 Client Preferences

- theme
- sound
- timer visibility (cosmetic)

### 11.4 Server State

- user profile (`uid`)
- lifetime stats
- per-game summaries

---

## 12. Accounts, Auth, and Offline Sync

### 12.1 Authentication

- Support **Google sign-in** and **email/password**

### 12.2 Offline-First Behavior

- Fully playable offline
- Logged-in users continue accruing stats offline
- Data queued locally and synced on reconnect

### 12.3 PWA

- Installable
- App shell + engine cached

### 12.4 Guest vs Logged-in Access

On first arrival ("/"), the app uses a minimal local session model:

- session is initially "unset"
- user can choose **Play as guest** or **Log in** (MVP local-only for now)
- Guests can see the shell of restricted pages (e.g., /stats) but content is replaced with a login prompt. This avoids hard redirects and keeps navigation predictable.

Access behavior (MVP):

- Guests can access "/game" and "/settings".
- Guests can visit "/stats", but the page renders a friendly prompt to log in (no redirect).
- Logged-in users can access all routes.
- MVP rule: do not redirect guests away from /stats; render the page shell with a login prompt instead.

Implementation note:

- Model this as an app-level `sessionMode: "unset" | "guest" | "user"` (plus `uid` when logged in).
- Persist the mode locally so a refresh doesn’t forget the choice.

UI note:

- Keep **engine state** (GameState) global via `GameProvider`.
- Keep **session/auth state** separate (e.g. `SessionProvider`) so it can gate routes like `/stats` without entangling the engine.

### 12.5 Leaderboards & Privacy (Later)

- Leaderboards are planned but not MVP.
- They imply decisions about what stats are public, whether users have public profiles, and what the default privacy mode should be.
- MVP approach: keep per-user stats private; add leaderboards only after real auth + sync are stable.

---

## 12A. V2 User Profile Preferences (Sync Across Devices)

For logged-in users, the user profile stores preferences + default difficulty knobs:

- `theme`
- `showTimer` (cosmetic)
- `knowsHowToPlay`
- `soundOn`
- `undoLimitDefault` (`0 | 1 | 3 | 5 | "unlimited"`)
- `faceDownCountDefault` (`0 | 7 | 14 | 21`)
- `allowFoundationPullbackDefault` (boolean; default true)

Import behavior:

- If present in V1 export, migrate.
- Otherwise use V2 defaults.

---

## 12B. V2 Stats Model (Filterable by Game Settings)

### 12B.1 Principle

All time-based and performance stats should be interpretable in context. Each recorded game should include the **rules/difficulty settings used**, enabling filtering/sorting later. Guests do not create server records; they may have optional local-only stats later, but those are out of scope for the first pass.

### 12B.2 Per-game record (recommended canonical source)

Store one record per finished/abandoned game:

- `seed`
- `startedAt`, `endedAt`
- `result`: `"win" | "abandon"` (and optionally `"loss"` if you ever add it)
- `durationMs`
- `moveCount`
- `undosUsed`
- `settings`:
  - `faceDownCount` (`0 | 7 | 14 | 21`)
  - `undoLimit` (`0 | 1 | 3 | 5 | "unlimited"`)
  - `allowFoundationPullback` (boolean)

Optional fields (later): device/platform, hint usage, autocomplete usage.

### 12B.3 Aggregates (derived)

Maintain quick aggregates (can be recomputed from per-game records):

- `totalGames`, `totalWins`, `totalAbandons`
- `bestWinMs`
- `currentWinStreak`, `bestWinStreak`

### 12B.4 V1 import policy (chosen)

- Import wins + totalGames as **legacy**
- Mark imported aggregates/records with `legacyImported: true` so V2-native stats remain clean going forward

---

## 13. Difficulty Modifiers

- Face-down cards at deal: `0 / 7 / 14 / 21` (V-shape layering; 0 = all face-up)
- Foundation pullback (on/off)
- Undo limit (`0 / 1 / 3 / 5 / unlimited`)

---

## 14. V1 → V2 Migration

### 14.1 V1 Data Audit (Next Action)

Before defining import schemas, **inspect real V1 data**.

Plan:

- Play multiple V1 games locally
- Capture full localStorage snapshots
- Inventory:
  - keys
  - value shapes
  - derived vs authoritative data
- Identify what should:
  - be ignored
  - be migrated as stats
  - become preferences

#### 14.1.1 Observed keys in the current sample snapshot

From the sample export you provided, V1 currently stores 13 top-level keys under `data`:

**Preferences**

- `vCellTheme` (string)
- `vCellIsTimerVisible` (string boolean)
- `vCellKnowsHowToPlay` (string boolean)
- `vCellSoundOn` (string boolean) — may or may not exist; treat as optional

**Rule/difficulty knobs**

- `vCellLayout` (string)
- `vCellUndosAllowed` (string; includes the value `Infinity`)

**Stats**

- `vCellWinRatio` (object with `wins`, `totalGames`)
- `vCellWinHistory` (array of win records)

**Current session / derived (do NOT import for V2 stats-only migration)**

- `vCellCurrentBoard` (object)
- `vCellMoveHistory` (array)
- `vCellTimeElapsed` (string number)
- `vCellUndosUsed` (string number)
- `vCellAutoComplete` (string boolean; derived)
- `vCellWinningBoard` (string boolean; derived)

This inventory is what the first draft of `sanitizeV1Export()` is based on.

### 14.2 Where the imported data is written (V2 targets)

After `sanitizeV1Export()` runs, the import result is applied to the logged-in user’s `uid`.

Recommended write targets (backend-agnostic):

**A) User profile (preferences + defaults)**

- Path concept: `users/{uid}/profile`
- Write:
  - `theme`, `showTimer`, `knowsHowToPlay`, `soundOn`
  - `undoLimitDefault`, `faceDownCountDefault`, `allowFoundationPullbackDefault`

**B) Per-game records (canonical history)**

- Path concept: `users/{uid}/games/{gameId}`
- For each imported V1 win record, create a new record with:
  - `result: "win"`
  - `durationMs`
  - `endedAt`
  - `settings` (best-effort from V1: `faceDownCount`, `undoLimit`; pullback may default)
  - `legacyImported: true`

**C) Stats aggregates (fast reads)**

- Path concept: `users/{uid}/stats`
- Write:
  - `totalWins`, `totalGames`, `bestWinMs` (and any other aggregates you choose)
  - `legacyImported: true`

Idempotency:

- Store `importMeta.importId` under something like `users/{uid}/imports/{importId}`.
- If the same importId is seen again, skip writing (prevents double-import).

### 14.3 Draft: `sanitizeV1Export()` (TypeScript)

This runs during V2 import. It takes raw V1 export JSON and returns a normalized, V2-ready object. It **drops derived/current-game keys** and converts stringly-typed values into real types.

```ts
// V1 export shape (as produced by your exportLocalStorageToJson helper)
export type V1Export = {
  app: string;
  schemaVersion: number;
  exportedAt: string; // ISO
  data: Record<string, unknown>;
};

export type V2UndoLimit = 0 | 1 | 3 | 5 | "unlimited";

export type V2ImportedPreferences = {
  theme?: string;
  showTimer?: boolean; // cosmetic
  knowsHowToPlay?: boolean;
  soundOn?: boolean;
};

export type V2ImportedRules = {
  // from vCellLayout; maps to your deal-time buried card config
  // (you can extend this once you confirm all V1 layout values)
  faceDownCount?: 0 | 7 | 14 | 21;
  pattern?: "V";

  allowFoundationPullback?: boolean; // NOT present in V1 export today
  undoLimit?: V2UndoLimit;
};

export type V2ImportedGameRecord = {
  // We only import what V1 can prove (wins). Total games/abandons are aggregate only.
  endedAt: string; // ISO
  result: "win";
  durationMs: number;
  layout?: string;
};

export type V2SanitizedImport = {
  importMeta: {
    sourceApp: "vcell";
    sourceSchemaVersion: number;
    exportedAt: string;
    // used to ensure idempotent imports (store per-user)
    importId: string; // sha256 of canonicalized export
    legacyImported: true;
  };
  preferences: V2ImportedPreferences & {
    soundOn?: boolean;
    undoLimitDefault?: V2UndoLimit;
    faceDownCountDefault?: 0 | 7 | 14 | 21;
    allowFoundationPullbackDefault?: boolean;
  };
  rules: V2ImportedRules;
  stats: {
    wins?: number;
    totalGames?: number;
    bestWinMs?: number;
  };
  gameRecords: V2ImportedGameRecord[];
  ignoredKeys: string[]; // for debugging/audit
};

function toBool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    if (t === "true") return true;
    if (t === "false") return false;
  }
  return undefined;
}

function toInt(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return undefined;
}

function parseUndoLimit(v: unknown): V2UndoLimit | undefined {
  if (v === "Infinity") return "unlimited";
  const n = toInt(v);
  if (n === 0 || n === 1 || n === 3 || n === 5) return n;
  if (v === "unlimited") return "unlimited";
  return undefined;
}

function layoutToFaceDown(layout: unknown): 0 | 7 | 14 | 21 | undefined {
  // V1 snapshot shows: "classic" => 7
  // Extend this mapping once we see other V1 layout values.
  if (layout === "classic") return 7;
  return undefined;
}

function clampMs(ms: unknown): number | undefined {
  const n = toInt(ms);
  if (n == null) return undefined;
  // basic sanity: 0ms..30 days (arbitrary but prevents absurd imports)
  const MAX = 30 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.min(n, MAX));
}

// NOTE: implement sha256 using WebCrypto (browser) or node:crypto (server)
async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sanitizeV1Export(
  raw: unknown
): Promise<V2SanitizedImport> {
  // 1) Basic shape validation
  if (!raw || typeof raw !== "object")
    throw new Error("Invalid export: not an object");
  const exp = raw as Partial<V1Export>;
  if (exp.app !== "vcell") throw new Error("Invalid export: wrong app");
  if (exp.schemaVersion !== 1)
    throw new Error("Invalid export: unsupported schemaVersion");
  if (!exp.exportedAt || typeof exp.exportedAt !== "string")
    throw new Error("Invalid export: missing exportedAt");
  if (!exp.data || typeof exp.data !== "object")
    throw new Error("Invalid export: missing data");

  const d = exp.data as Record<string, unknown>;

  // 2) Compute importId for idempotency (canonicalize by stable key ordering)
  const canonical = JSON.stringify(
    {
      app: exp.app,
      schemaVersion: exp.schemaVersion,
      exportedAt: exp.exportedAt,
      data: d
    },
    Object.keys({ app: 1, schemaVersion: 1, exportedAt: 1, data: 1 }) as any
  );
  const importId = await sha256Hex(canonical);

  // 3) Pull preferences
  const preferences: V2ImportedPreferences = {
    theme: typeof d.vCellTheme === "string" ? d.vCellTheme : undefined,
    showTimer: toBool(d.vCellIsTimerVisible),
    knowsHowToPlay: toBool(d.vCellKnowsHowToPlay),
    soundOn: toBool(d.vCellSoundOn)
  };

  // 4) Pull rule-ish knobs
  const rules: V2ImportedRules = {
    faceDownCount: layoutToFaceDown(d.vCellLayout),
    pattern: layoutToFaceDown(d.vCellLayout) ? "V" : undefined,
    undoLimit: parseUndoLimit(d.vCellUndosAllowed)
  };

  // 5) Import win records (what V1 can prove)
  const gameRecords: V2ImportedGameRecord[] = Array.isArray(d.vCellWinHistory)
    ? d.vCellWinHistory
        .filter((x): x is any => x && typeof x === "object")
        .map((w) => {
          const date = typeof w.date === "string" ? w.date : undefined;
          const timeElapsed = clampMs(w.timeElapsed);
          if (!date || timeElapsed == null) return null;
          return {
            endedAt: new Date(date).toISOString(),
            result: "win" as const,
            durationMs: timeElapsed,
            layout: typeof w.layout === "string" ? w.layout : undefined
          };
        })
        .filter((x): x is V2ImportedGameRecord => x !== null)
    : [];

  // 6) Import aggregates (if present) but treat as secondary
  const wins =
    typeof d.vCellWinRatio === "object" && d.vCellWinRatio
      ? toInt((d.vCellWinRatio as any).wins)
      : undefined;
  const totalGames =
    typeof d.vCellWinRatio === "object" && d.vCellWinRatio
      ? toInt((d.vCellWinRatio as any).totalGames)
      : undefined;
  const bestWinMs = gameRecords.length
    ? Math.min(...gameRecords.map((r) => r.durationMs))
    : undefined;

  // 7) Explicitly ignore current-game / derived keys
  const ignoredKeys = [
    "vCellCurrentBoard",
    "vCellMoveHistory",
    "vCellTimeElapsed",
    "vCellUndosUsed",
    "vCellAutoComplete",
    "vCellWinningBoard"
  ].filter((k) => k in d);

  return {
    importMeta: {
      sourceApp: "vcell",
      sourceSchemaVersion: 1,
      exportedAt: exp.exportedAt,
      importId,
      legacyImported: true
    },
    preferences,
    rules,
    stats: { wins, totalGames, bestWinMs },
    gameRecords,
    ignoredKeys
  };
}
```

### 14.2 Export / Import

- V1 export produces versioned JSON
- V2 import sanitizes + normalizes
- Import is idempotent

---

## 15. Out of Scope (For Now)

- Full solver
- Multiplayer
- Server-authoritative move validation

---

## 16. Engine Type Blueprint (Draft)

This section defines the _canonical_ TypeScript shapes for the engine contract. The UI must treat these as the source of truth.

### 16.0 `createGame(seed, rules)` responsibilities

`createGame(seed, rules)` is the single entry point for producing an initial, deterministic game state.

Responsibilities:

- Shuffle a standard 52‑card deck deterministically from `seed`
- Deal **exactly 49 cards** into the tableau (7 columns × 7 cards)
- Deal the remaining **3 cards** into the first 3 free cells
- Initialize 2 empty free cells
- Initialize 4 empty foundation slots (no suit until an Ace is placed)
- Apply the **deal-time face-down V pattern** based solely on `rules.faceDownCount`
  - No randomness beyond the deck shuffle
  - The face-down layout must be fully reproducible from `(seed, rules)`

This guarantees:

- Restarting a deal is exact
- The same seed + rules always produce the same board
- Difficulty is encoded in rules, not baked into the seed

---

### 16.1 Rules

```ts
export type UndoLimit = 0 | 1 | 3 | 5 | "unlimited";
export type FaceDownCount = 0 | 7 | 14 | 21;

export type Rules = {
  faceDownCount: FaceDownCount; // deal-time difficulty
  allowFoundationPullback: boolean; // difficulty toggle
  undoLimit: UndoLimit; // difficulty toggle (UI-enforced; engine can stay stateless)
};
```

### 16.2 Cards

```ts
export type Suit = "spades" | "hearts" | "clubs" | "diamonds";
export type Color = "red" | "black";
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13; // 1=Ace

export type CardId = string; // stable ID (e.g., "AS", "10H", etc.)

export type Card = {
  id: CardId;
  suit: Suit;
  rank: Rank;
  color: Color;
};
```

### 16.3 Piles / Locations

```ts
export type TableauIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type FreeCellIndex = 0 | 1 | 2 | 3 | 4;

export type FoundationIndex = 0 | 1 | 2 | 3;

export type PileRef =
  | { type: "tableau"; index: TableauIndex }
  | { type: "freecell"; index: FreeCellIndex }
  | { type: "foundation"; index: FoundationIndex };
```

### 16.4 Tableau card visibility (face-down)

Tableau columns are arrays ordered TOP→BOTTOM; the exposed/active card is the LAST element. Because V-Cell supports `faceDownCount` (7/14/21), the engine needs to represent which tableau cards are face-down.

Proposed representation:

```ts
export type TableauCard = {
  card: Card;
  faceDown: boolean;
};
```

Proposed rule:

- Face-down tableau cards are **not movable**.
- When a move results in a face-down card becoming the **exposed** card of a tableau column, it **auto-flips immediately** to face-up (engine-side), without consuming a player move.

### 16.5 GameState

```ts
export type FoundationSlot = {
  suit: Suit | null; // null until an Ace is placed
  cards: Card[]; // builds Ace→King once suit is set
};

export type GameState = {
  seed: string;
  rules: Rules;

  tableau: TableauCard[][]; // length 7
  freeCells: (Card | null)[]; // length 5
  foundations: [FoundationSlot, FoundationSlot, FoundationSlot, FoundationSlot];
};
```

### 16.6 Move (engine contract)

Moves are what the UI sends to the engine.

```ts
export type Move =
  | {
      kind: "tableauStack";
      from: { type: "tableau"; index: TableauIndex };
      startIndex: number; // index in the TOP→BOTTOM tableau array; moving the contiguous sub-stack from startIndex down to the bottom (end)
      to: { type: "tableau"; index: TableauIndex };
    }
  | {
      kind: "single";
      from: PileRef;
      to: PileRef;
    };
```

Notes:

- `single` is used for all single-card moves (to foundations or free cells, and foundation pullback when enabled).
- `tableauStack` is used only for tableau→tableau stack moves.

### 16.7 Derived helpers (engine)

```ts
// Public helpers
export function areAllCardsUnlocked(state: GameState): boolean;
export function getAutoCompleteMoves(state: GameState): Move[];
export function isWin(state: GameState): boolean; // true when all cards exposed

// Internal/UI helpers (not exported from the engine public index)
export function getMovableRunLengths(state: GameState): number[]; // UI highlight for grabbable run
```

---

## 17. Next Steps

1. Web routes: add `/settings` and `/stats` pages (placeholders first).
2. Add a minimal session model: `sessionMode: "guest" | "user"` persisted locally + route gating for `/stats`.
3. Start real gameplay rendering: render tableau/freecells/foundations from engine state.
4. Define UI state boundaries: what stays global vs per-page (drag state, modals, animations).
5. Drag/drop + highlighting + double-click auto-send to foundation.
6. Hint strategy (Phase 1 heuristics → optional lookahead/solver later).
7. V1 import: finalize `sanitizeV1Export()` location + wire import UI flow.
