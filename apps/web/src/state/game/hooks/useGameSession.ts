import { useCallback, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { createGame } from "@vcell/engine";
import type { GameState, Rules, Move } from "@vcell/engine";
import { HistoryState } from "../GameProvider";
import { getInProgressGameForDevice } from "@/persistence/inProgressGamesStore";
import { getOrCreateDeviceId } from "@/persistence/schema";
import {
  gameStore,
  startSession as startSession_new,
  selectSeed,
  selectGameId
} from "@/state/gameStore_new";

type StartSessionMode =
  | { kind: "new" }
  | { kind: "seed"; seed: string }
  | { kind: "seed+id"; seed: string; gameId: string };

function safeRandomId(): string {
  // Prefer the native UUID if available
  const c = globalThis.crypto as Crypto | undefined;
  const maybeUUID = c?.randomUUID;
  if (typeof maybeUUID === "function") return maybeUUID.call(c);

  // Fallback: 16 random bytes -> hex (not a UUID, but plenty unique for IDs/seeds)
  if (c?.getRandomValues) {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Last-ditch fallback (worst uniqueness, but avoids crashing)
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeNewSeed(): string {
  return safeRandomId();
}

function makeNewGameId(): string {
  return safeRandomId();
}

export type UseGameSessionParams = {
  rules: Rules;

  // Use these as deps for the "rule changes => reseed" effect.
  allowFoundationPullback: boolean;
  undoLimit: Rules["undoLimit"];
  faceDownCount: Rules["faceDownCount"];

  // State setters owned by GameProvider
  setHistory: React.Dispatch<React.SetStateAction<HistoryState>>;
  setTimeElapsedMs: React.Dispatch<React.SetStateAction<number>>;
  setHasStarted: React.Dispatch<React.SetStateAction<boolean>>;
  setStartedAtMs: React.Dispatch<React.SetStateAction<number | null>>;
  setEndedAtMs: React.Dispatch<React.SetStateAction<number | null>>;
  setIsAbandoned: React.Dispatch<React.SetStateAction<boolean>>;
  setUndosUsed: React.Dispatch<React.SetStateAction<number>>;
  setMoveCount: React.Dispatch<React.SetStateAction<number>>;
  setMoves: React.Dispatch<React.SetStateAction<Move[]>>;
  setCursor: React.Dispatch<React.SetStateAction<number>>;
  cursorRef: React.RefObject<number>;
  setCheckpoint: React.Dispatch<
    React.SetStateAction<{ at: number; state: GameState } | null>
  >;
};

export type UseGameSessionResult = {
  seed: string;
  gameId: string;

  startNewDealSession: () => void;
  replaySeed: (seed: string) => void;

  // Useful for debugging / future extractions (kept private-ish but returned).
  startSession: (mode: StartSessionMode) => void;
};

/**
 * Owns the concept of a "game session": seed + gameId + readiness, and the
 * choreography that resets all per-session state.
 */
export function useGameSession({
  rules,
  setHistory,
  setTimeElapsedMs,
  setHasStarted,
  setStartedAtMs,
  setEndedAtMs,
  setIsAbandoned,
  setUndosUsed,
  setMoveCount,
  setMoves,
  setCursor,
  cursorRef,
  setCheckpoint
}: UseGameSessionParams): UseGameSessionResult {
  // Seed/gameId are now owned by the RTK store.
  // Keep deterministic placeholders to avoid hydration mismatches.
  const seed = useSelector(selectSeed);
  const gameId = useSelector(selectGameId);

  const startSession = useCallback(
    (mode: StartSessionMode) => {
      const nextSeed = mode.kind === "new" ? makeNewSeed() : mode.seed;
      const nextGameId =
        mode.kind === "seed+id" ? mode.gameId : makeNewGameId();

      // Persist session identity to the new RTK store.
      gameStore.dispatch(
        startSession_new({ rules, seed: nextSeed, gameId: nextGameId })
      );

      // New session.
      setHistory({ present: createGame(nextSeed, rules), past: [] });

      setTimeElapsedMs(0);
      setHasStarted(false);
      setStartedAtMs(null);
      setEndedAtMs(null);
      setIsAbandoned(false);
      setUndosUsed(0);
      setMoveCount(0);
      setMoves([]);
      setCursor(0);
      cursorRef.current = 0;
      setCheckpoint(null);
    },
    [
      rules,
      setHistory,
      setTimeElapsedMs,
      setHasStarted,
      setStartedAtMs,
      setEndedAtMs,
      setIsAbandoned,
      setUndosUsed,
      setMoveCount,
      setMoves,
      setCursor,
      cursorRef,
      setCheckpoint
    ]
  );

  const startSessionRef = useRef(startSession);

  useEffect(() => {
    startSessionRef.current = startSession;
  }, [startSession]);

  // ---------------------------------------------------------------------------
  // Client-only bootstrap (resume most recent in-progress game if present)
  // ---------------------------------------------------------------------------
  const didInitRandomSeedRef = useRef(false);

  useEffect(() => {
    if (didInitRandomSeedRef.current) return;
    didInitRandomSeedRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        const deviceId = getOrCreateDeviceId();
        const saved = await getInProgressGameForDevice(deviceId);

        if (cancelled) return;

        if (saved) {
          startSessionRef.current({
            kind: "seed+id",
            seed: saved.seed,
            gameId: saved.gameId
          });
        } else {
          startSessionRef.current({ kind: "new" });
        }
      } catch (err) {
        console.error(
          "Failed to bootstrap session from in-progress games",
          err
        );

        if (cancelled) return;
        startSessionRef.current({ kind: "new" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const startNewDealSession = useCallback(() => {
    startSession({ kind: "new" });
  }, [startSession]);

  const replaySeed = useCallback(
    (nextSeed: string) => {
      startSession({ kind: "seed", seed: nextSeed });
    },
    [startSession]
  );

  return {
    seed,
    gameId,
    startNewDealSession,
    replaySeed,
    startSession
  };
}
