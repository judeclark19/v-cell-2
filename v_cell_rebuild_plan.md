# V-Cell V2 — Rebuild Plan (Living Spec)

This is the canonical “what is true right now” doc for V-Cell V2: architecture, rules, UX commitments, and the major decisions we’ve already made. It is not a diary. If something is implemented, it should be reflected here succinctly. If something is planned, it should be labeled as planned.

---

## 1. Purpose

V-Cell V2 is a ground-up rebuild focused on:

- **Correctness** (engine is deterministic and testable)
- **Feel** (UI interaction is responsive, readable, keyboard-first)
- **Extensibility** (features can grow without breaking rules)

Core architectural goal: **separate the game engine (rules + state)** from the **web UI (rendering + interaction + persistence)**.

---

## 2. Repo Architecture

### 2.1 Packages

**`packages/engine/`** (pure TypeScript)

- Game rules + state transitions only
- No React, no DOM, no browser APIs
- Deterministic, replayable, testable

**`apps/web/`** (Next.js)

- Renders engine state
- Owns interaction (drag/drop, keyboard, focus, animations)
- Owns session/prefs/stats plumbing

**`packages/ui/`** (optional / future)

- Shared UI primitives + design tokens if needed

### 2.2 Feature Organization (Web)

Board logic is organized under `apps/web/src/features/game-board/...` so `apps/web/app` stays focused on routing/layout.

### 2.3 Persistence (Web)

V2 uses a **tiered persistence** approach:

- **localStorage**: small, human-readable settings and lightweight session flags
  - examples: theme, undoLimit, allowFoundationPullback, faceDownCount, timer visibility
- **IndexedDB**: larger and/or structured data
  - examples: completed game history, per-game metadata, optional move logs, offline stats queue

Guidelines:

- Prefer localStorage for < 10KB totals and values that must be readable without migrations.
- Prefer IndexedDB for lists/arrays, history, and anything that could grow over time.
- All persisted data should be **versioned** and written behind a small adapter layer.

---

## 3. Routes (Web)

Implemented:

- `/` entry
- `/game` gameplay
- `/login` minimal login/guest session

Planned / in progress:

- `/settings` preferences + difficulty knobs
- `/stats` history + aggregates (guests see prompt)

---

## 4. Engine Contract (Stable)

Engine exposes:

- `createGame(seed, rules) -> GameState`
- `getLegalMoves(state) -> Move[]`
- `applyMove(state, move) -> GameState`
- `areAllCardsUnlocked(state) -> boolean`
- `getAutoCompleteMoves(state) -> Move[]`
- `isWin(state) -> boolean`

UI treats engine as source of truth for legality.

---

## 5. Game Model

### 5.1 Board Zones

- **Tableau:** 7 columns × 7 cards (49)
- **Free cells:** 5 slots (game starts with 3 occupied, 2 empty)
- **Foundations:** 4 slots (dynamic suit assignment)
- No stock/waste

### 5.2 Deal + Face-down Pattern (V-Cell)

Config: `faceDownCount: 0 | 7 | 14 | 21`

Pattern uses 7 tableau columns with “depths”:
`[0, 1, 2, 3, 2, 1, 0]`

Layers:
`layers = faceDownCount / 7`

For each column `i`:

- face-down cards begin at `depth[i]`
- mark next `layers` cards as face-down

Behavior:

- face-down cards are not movable
- when a face-down card becomes top of a column, engine auto-flips it immediately

---

## 6. Move Rules (Engine)

### 6.1 Tableau → Tableau (stack moves)

- move any contiguous sub-stack
- internal stack validity:
  - descending rank
  - alternating colors
- empty tableau column accepts **Kings only**

### 6.2 Single-card destinations

- **to free cell:** single card only
- **to foundation:** single card only

---

## 7. Foundations

### 7.1 Dynamic Suit Assignment

- 4 foundation slots are not suit-fixed
- a slot becomes suit-locked when an Ace is placed
- builds Ace → King in that suit

### 7.2 Foundation Pullback (Difficulty Toggle)

`allowFoundationPullback: boolean` (default **true** in V2)

When enabled:

- only top foundation card can move out
- single-card move only
- destination: tableau (if legal) or empty free cell
- if pullback empties a foundation slot, its suit resets to `null`

When disabled:

- foundation cards cannot be picked up in UI
- engine legality still defines truth

---

## 8. Win + Auto-Complete

### 8.1 Primary Win Condition (Confirmed)

**Win = no locked tableau cards remain.**

- win is based on unlocking tableau, not on foundation completion
- engine implements via `areAllCardsUnlocked` → `isWin`

### 8.2 Auto-Complete (Cosmetic Completion)

Auto-complete becomes available once the tableau is fully unlocked (win achieved).

- sends remaining tableau cards to foundations for visual completion
- player may choose to keep playing manually instead

---

## 9. UI Interaction Model (Web)

### 9.1 Board Rendering

Board is composed of presentational zone components:

- `Foundations`, `Tableau`, `FreeCells`

Board orchestration:

- Board wires state to zones
- Board owns move commitment (via extracted hooks)
- Zone components do not apply moves themselves

### 9.2 Drag & Drop

- supports single-card and tableau stack drag
- supports foundation pullback (if enabled)
- UI may temporarily diverge visually (drag layer, hiding origin top card) but **engine state changes only on commit**

### 9.3 Keyboard Play (Core Feature, Not Polish)

Implemented behavior:

- Tab / Shift+Tab enter/leave board region
- Arrow keys move within board (roving focus model)
- focus defaults to playable items (and expands to targets while carrying)

Carry mode:

- Space toggles carry mode (pick up / prepare to drop)
- while carrying: drop targets become targetable
- carry cancels if focus leaves board

Shortcuts:

- Enter / F: attempt auto-foundation move (deterministic choice)
- C: attempt auto-move to free cell (deterministic choice)
- U: undo (focus returns to moved card)
- N: new game (seeded deal)

Mouse-to-keyboard entry:

- clicking board focuses a playable card (clicked card if playable, otherwise first playable)

### 9.4 Visual Semantics

- “playable” = pick-up-able right now
- “faceDown” = dealt face-down by V pattern
- “locked/unlocked” = gameplay progression concept; win is “no locked tableau cards”

Keyboard highlight styling:

- uses dedicated semantic token: `--kb-highlight`
- avoids overusing accent color

---

## 10. Timer & Pause

Timer rules (confirmed):

- measures **active, unpaused play time only**
- starts on **first committed move**
- pauses when:
  - game is explicitly paused
  - tab/window inactive
- does **not** reset on restart
- does reset on new deal
- timer visibility is cosmetic preference

Persistence notes:

- store `startedAtMs` / `endedAtMs` / `accumulatedMs` in the session layer so refresh resumes correctly
- never persist derived UI flags (e.g. transient animation state)

Pause:

- pause should disable board interactions (keyboard/drag)
- keyboard controls should still work before the first move (except pause button disabled until start)

---

## 11. Undo (UI Layer)

Undo is implemented in the web layer (GameProvider), not the engine, to preserve engine purity.

Undo limit is a difficulty setting:
`0 / 1 / 3 / 5 / unlimited`

UI is responsible for:

- storing history (snapshots or replay)
- enforcing limits
- focus restoration after undo (prefer moved card)

Persistence notes:

- Undo history should remain in-memory for performance; optionally persist only **completed game summaries**.

---

## 12. Themes

Themes are CSS-token based.

- applied via root `data-theme`
- hydration-safe initialization implemented to prevent theme flash
- includes Poker / Times Light / Times Dark
- Times Dark previously exhibited a “flash of wrong colors” on refresh; mitigation is tracked as a UI concern (likely initial token application timing)

Semantic token:

- `--kb-highlight` (keyboard carry/target highlight)

---

## 13. Session / Auth / Stats (Direction)

### 13.1 Session Modes

MVP session model:

- `sessionMode: "unset" | "guest" | "user"` persisted locally
- guests can play and view page shells
- `/stats` shows prompt for guests rather than redirecting

### 13.2 Data We Persist

Small preferences (localStorage):

- `theme`, `showTimer`
- gameplay settings: `undoLimit`, `allowFoundationPullback`, `faceDownCount`

Session + history (IndexedDB):

- `currentSession` (optional): last active `gameId`, seed, rules, and minimal timer fields
- `completedGames[]`: results with `seed`, `startedAtMs`, `endedAtMs`, moveCount, status
- optional `moveLog` (future): only if we decide to support replay or analytics

### 13.3 IndexedDB Schema (Draft)

Database: `vcell`

- store `meta` (key/value)
  - keys: `schemaVersion`, `lastMigrationAt`
- store `completedGames`
  - keyPath: `gameId`
  - indexes: `endedAtMs`, `status`, `seed`
- store `statsQueue` (planned)
  - keyPath: `id`
  - fields: `type`, `payload`, `createdAtMs`, `attemptCount`

### 13.4 Offline-first Direction

Planned:

- offline-first stats queue
- sync for logged-in users
- leaderboards later (requires privacy policy decisions)

Constraints:

- engine remains pure; only the web app reads/writes storage
- all persisted records must be forward-migratable

---

## 14. Migration: V1 → V2 (Planned)

Principle:

- import preferences and win history carefully
- do not import in-progress games or derived flags

Plan:

- inspect real V1 localStorage snapshots
- define `sanitizeV1Export()` mapping
- make import idempotent with `importId`

---

## 15. Current State Summary (What’s Actually Done)

- engine contract exists and is stable (create/getLegalMoves/applyMove/isWin)
- board renders with unified 7-column rhythm
- drag/drop functional with generalized move commit hooks
- keyboard navigation + carry mode + deterministic F/C behaviors implemented
- undo implemented + keyboard U wired
- timer implemented + starts on first move + pauses
- feature folder restructure completed (`features/game-board`)
- kb highlight semantic token introduced and applied

---

## 16. Next Work Areas

- persistence adapter: define localStorage + IndexedDB wrappers + schema version
- stats page MVP: read from IndexedDB `completedGames` and show aggregates for guest
- pause toggle wired to keyboard `P` and UI button, ensuring interactions disable only when paused
- complete keyboard spec checklist + verify all focus/target behaviors
- autoplay/auto-complete button gating: show once tableau unlocked
- resolve Times Dark refresh “flash” if still reproducible
- keep extracting/typing cleanup where types are duplicated across layers
