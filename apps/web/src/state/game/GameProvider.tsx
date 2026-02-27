"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useGameTimer } from "./hooks/useGameTimer";
import { useGameSnapshotLogger } from "./hooks/useGameSnapshotLogger";
import { applyMove, createGame } from "@vcell/engine";
import type { GameState, Move, Rules, UndoLimit } from "@vcell/engine";
import { useGameSession } from "./hooks/useGameSession";
import { useGameActions } from "./hooks/useGameActions";
import { useGameSettings } from "./hooks/useGameSettings";
import { useGameDerivedState } from "./hooks/useGameDerivedState";
import { useCompletedGamesPersistence } from "../../persistence/hooks/useCompletedGamesPersistence";
import { useInProgressGamePersistence } from "../../persistence/hooks/useInProgressGamePersistence";
import type { PersistedGame } from "@/persistence/types";
import { useSession } from "@/state/session/SessionProvider";

import { useLoginReconcileInProgressGame } from "./hooks/useLoginReconcileInProgressGame";
import { useSelector } from "react-redux";
import {
  selectSessionPhase,
  selectSeed,
  hydrateHistory,
  gameStore,
  selectHistory
} from "../gameStore_new";

type UiResets = {
  resetDrag?: () => void;
  stopAutoComplete?: () => void;
};

type GameContextValue = {
  sessionReady: boolean;
  state: GameState;
  isWon: boolean;
  dispatchMove: (move: Move) => void;
  registerUiResets: (handlers: UiResets | null) => void;
  restart: () => void;
  newDeal: () => void;
  replaySeed: (seed: string) => void;
  startBySeed: (seed: string) => void;
  undo: () => void;
  canUndo: boolean;
  undoLimit: UndoLimit;
  setUndoLimit: (next: UndoLimit) => void;
  undosRemaining: number; // Infinity when unlimited
  faceDownCount: Rules["faceDownCount"];
  setFaceDownCount: (next: Rules["faceDownCount"]) => void;
  showTimer: boolean;
  setShowTimer: (next: boolean) => void;
  paused: boolean;
  setPaused: (next: boolean) => void;
  allowFoundationPullback: boolean;
  setAllowFoundationPullback: (next: boolean) => void;
  historyReady: boolean;
  timeElapsedMs: number;
  startedAtMs: number | null;
  endedAtMs: number | null;
  hasStarted: boolean;
  isAbandoned: boolean;
  setIsAbandoned: (next: boolean) => void;
  moveCount: number;
  gameId: string;
  completedGames: PersistedGame[];
};

const GameContext = createContext<GameContextValue | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within <GameProvider />");
  return ctx;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  // ---------------------------------------------------------------------------
  // Seed + rules
  // ---------------------------------------------------------------------------
  // Seed and gameId state are now owned by useGameSession.

  const [allowFoundationPullback, setAllowFoundationPullback] =
    useState<boolean>(true);

  // ---------------------------------------------------------------------------
  // UI settings (localStorage)
  // ---------------------------------------------------------------------------
  const {
    showTimer,
    setShowTimer,
    undoLimit,
    setUndoLimit,
    faceDownCount,
    setFaceDownCount
  } = useGameSettings();

  const rules = useMemo<Rules>(
    () => ({
      allowFoundationPullback,
      faceDownCount,
      undoLimit
    }),
    [allowFoundationPullback, faceDownCount, undoLimit]
  );

  const [checkpoint, setCheckpoint] = useState<{
    at: number;
    state: GameState;
  } | null>(null);

  // ---------------------------------------------------------------------------
  // History / engine state
  // ---------------------------------------------------------------------------

  const history = useSelector(selectHistory);

  const [hydratedGameId, setHydratedGameId] = useState<string | null>(null);

  const hydratedGameIdRef = useRef<string | null>(null);
  useEffect(() => {
    hydratedGameIdRef.current = hydratedGameId;
  }, [hydratedGameId]);

  const uiResetsRef = useRef<UiResets | null>(null);

  const { uid } = useSession();

  const [completedGames, setCompletedGames] = useState<PersistedGame[]>([]);
  useCompletedGamesPersistence({
    uid,
    completedGames,
    setCompletedGames
  });

  // ---------------------------------------------------------------------------
  // Run state (timer + pause)
  // ---------------------------------------------------------------------------
  const [timeElapsedMs, setTimeElapsedMs] = useState<number>(0);
  const timeElapsedMsRef = useRef<number>(0);
  useEffect(() => {
    timeElapsedMsRef.current = timeElapsedMs;
  }, [timeElapsedMs]);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [endedAtMs, setEndedAtMs] = useState<number | null>(null);
  const [isAbandoned, setIsAbandoned] = useState<boolean>(false);
  const [paused, setPaused] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // Undo analytics
  // ---------------------------------------------------------------------------
  const [undosUsed, setUndosUsed] = useState<number>(0);

  // Score-keeping move count: freezes once the game is won. (Cosmetic post-win moves are allowed.)
  const [moveCount, setMoveCount] = useState<number>(0);
  const [moves, setMoves] = useState<Move[]>([]);
  const [cursor, setCursor] = useState<number>(0);

  const cursorRef = useRef<number>(0);
  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  const movesRef = useRef<Move[]>(moves);

  useEffect(() => {
    movesRef.current = moves;
  }, [moves]);

  const didApplyRuleChangeOnceRef = useRef(false);
  const prevUidRef = useRef<string | null>(uid);

  const sessionPhase = useSelector(selectSessionPhase);
  const sessionReady = sessionPhase === "ready";

  // ---------------------------------------------------------------------------
  // Session (seed/gameId + init/reseed choreography)
  // ---------------------------------------------------------------------------
  const { seed, gameId, startNewDealSession, replaySeed, startSession } =
    useGameSession({
      rules,
      allowFoundationPullback,
      undoLimit,
      faceDownCount,
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
    });

  // Wrap startSession so all session resets can reliably cancel transient UI (autocomplete, drag overlays)
  // BEFORE the session key changes. This prevents the brief “initial values” window from triggering
  // persistence/delete logic and avoids stuck drag layers.
  const startSessionWithResets = useCallback(
    (...args: Parameters<typeof startSession>) => {
      uiResetsRef.current?.stopAutoComplete?.();
      uiResetsRef.current?.resetDrag?.();
      return startSession(...args);
    },
    [startSession]
  );

  const startNewDealSessionWithResets = useCallback(() => {
    startSessionWithResets({ kind: "new" });
  }, [startSessionWithResets]);

  const replaySeedWithResets = useCallback(
    (nextSeed: string) => {
      startSessionWithResets({ kind: "seed", seed: nextSeed });
    },
    [startSessionWithResets]
  );

  const registerUiResets = useCallback((handlers: UiResets | null) => {
    uiResetsRef.current = handlers;
  }, []);

  const setHydratedGameIdCallback = useCallback((next: string | null) => {
    setHydratedGameId(next);
  }, []);

  const historyReady = sessionPhase === "ready" && hydratedGameId === gameId;

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const { isWon, undosRemaining, canUndo } = useGameDerivedState({
    history,
    undoLimit,
    undosUsed
  });

  const onInProgressHydrated = useCallback(
    (saved: PersistedGame | null) => {
      if (!saved) {
        setHydratedGameIdCallback(gameId);
        return;
      }

      // Rebuild history.present from persisted moves/cursor so the UI reflects
      // the actual progressed game state after refresh.
      const appliedMoves = (saved.moves ?? []).slice(0, saved.cursor ?? 0);

      try {
        let present = createGame(saved.seed, saved.rules ?? rules);
        const past: GameState[] = [];

        for (const m of appliedMoves) {
          // push current state into past (for undo), then apply the move
          past.push(present);
          present = applyMove(present, m);

          // Respect undoLimit cap (keep the most recent states)
          if (undoLimit !== "unlimited" && past.length > undoLimit) {
            past.splice(0, past.length - undoLimit);
          }
        }

        gameStore.dispatch(hydrateHistory({ present, past }));
        setHydratedGameIdCallback(gameId);
      } catch (err) {
        console.error(
          "[hydrate] failed to apply persisted moves; falling back",
          {
            err,
            gameId,
            savedGameId: saved.gameId,
            seed: saved.seed,
            cursor: saved.cursor,
            movesLen: saved.moves?.length ?? 0,
            appliedLen: appliedMoves.length,
            savedRules: saved.rules,
            currentRules: rules
          }
        );

        // Fail soft: don't apply hydration, just mark this session as ready.
        setHydratedGameIdCallback(gameId);
      }
    },
    [rules, undoLimit, gameId, setHydratedGameIdCallback]
  );

  useInProgressGamePersistence({
    sessionReady,
    uid,
    gameId,
    seed,
    rules,
    onHydrated: onInProgressHydrated,
    isAbandoned,
    moves,
    cursor,
    timeElapsedMsRef,
    hasStarted,
    startedAtMs,
    endedAtMs,
    paused,
    moveCount,
    undosUsed,
    isWon,

    setMoves,
    setCursor,
    setTimeElapsedMs,
    setHasStarted,
    setStartedAtMs,
    setEndedAtMs,
    setIsAbandoned,
    setPaused,
    setMoveCount,
    setUndosUsed
  });

  useLoginReconcileInProgressGame({
    uid,
    startSession: startSessionWithResets,
    setHydratedGameId: (next) => setHydratedGameIdCallback(next),
    sessionReady
  });

  // When the user logs out, reset to a fresh guest deal ONCE (on uid transition).
  // IMPORTANT: Don't key off `uid === null && hasStarted` because `hasStarted` becomes true
  // on the first guest move and would cause an infinite redeal loop.
  useEffect(() => {
    if (sessionPhase !== "ready") return;

    const prevUid = prevUidRef.current;
    const didJustLogout = prevUid !== null && uid === null;

    // Keep the ref updated every run.
    prevUidRef.current = uid;

    if (!didJustLogout) return;

    // Only reset if the session we just logged out of had actually started.
    if (!hasStarted) return;

    // Defer state updates to avoid synchronous setState-in-effect warnings.
    queueMicrotask(() => {
      setHydratedGameIdCallback(null);
      startNewDealSession();
    });
  }, [
    uid,
    sessionPhase,
    hasStarted,
    startNewDealSession,
    setHydratedGameIdCallback
  ]);

  // ---------------------------------------------------------------------------
  // Timer loop
  // ---------------------------------------------------------------------------
  useGameTimer({
    paused,
    hasStarted,
    isWon,
    isAbandoned,
    setTimeElapsedMs,
    sessionReady
  });

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const { dispatchMove, restart, newDeal, startBySeed, undo } = useGameActions({
    history,

    seed,
    gameId,
    rules,
    undoLimit,
    uid,
    isWon,
    isAbandoned,
    hasStarted,
    endedAtMs,

    setHasStarted,
    setStartedAtMs,
    setEndedAtMs,
    setIsAbandoned,

    undosUsed,
    setUndosUsed,
    moveCount,
    setMoveCount,

    moves,
    setMoves,
    cursor,
    setCursor,
    cursorRef,
    movesRef,

    setCheckpoint,

    setCompletedGames,

    timeElapsedMs,
    startedAtMs,

    startNewDealSession: startNewDealSessionWithResets,
    replaySeed: replaySeedWithResets
  });

  const newDealRef = useRef(newDeal);

  useEffect(() => {
    newDealRef.current = newDeal;
  }, [newDeal]);

  // ---------------------------------------------------------------------------
  // Rule changes => abandon + archive current game, then start a new deal
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (sessionPhase !== "ready") return;

    // Skip initial mount (otherwise we'd immediately newDeal after boot).
    if (!didApplyRuleChangeOnceRef.current) {
      didApplyRuleChangeOnceRef.current = true;
      return;
    }

    // This will archive the current game if it has started, then start a new session.
    newDealRef.current();
  }, [sessionPhase, allowFoundationPullback, undoLimit, faceDownCount]);

  // ---------------------------------------------------------------------------
  // Snapshot logging
  // ---------------------------------------------------------------------------
  useGameSnapshotLogger({
    gameId,
    seed,
    state: history.present,
    hasStarted,
    isAbandoned,
    paused,
    canUndo,
    moveCount,
    undosUsed,
    timeElapsedMs,
    startedAtMs,
    endedAtMs,
    moves,
    cursor,
    checkpoint
  });

  // ---------------------------------------------------------------------------
  // Context value
  // ---------------------------------------------------------------------------
  const value: GameContextValue = {
    sessionReady,
    state: history.present,
    isWon,
    dispatchMove,
    registerUiResets,
    restart,
    newDeal,
    replaySeed,
    startBySeed,
    undo,
    canUndo,
    undoLimit,
    setUndoLimit,
    undosRemaining,
    faceDownCount,
    setFaceDownCount,
    showTimer,
    setShowTimer,
    paused,
    setPaused,
    allowFoundationPullback,
    setAllowFoundationPullback,
    historyReady,
    timeElapsedMs,
    startedAtMs,
    endedAtMs,
    hasStarted,
    isAbandoned,
    setIsAbandoned,
    moveCount,
    gameId,
    completedGames
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
