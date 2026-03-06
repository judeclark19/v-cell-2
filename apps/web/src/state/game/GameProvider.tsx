"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from "react";
import { useGameTimer } from "./hooks/useGameTimer";
import { useGameSnapshotLogger } from "./hooks/useGameSnapshotLogger";
import type { GameState, Move, UndoLimit } from "@vcell/engine";
import { useGameSession } from "./hooks/useGameSession";
import { useGameActions } from "./hooks/useGameActions";
import { useGameSettings } from "./hooks/useGameSettings";
import { useCompletedGamesPersistence } from "../../persistence/hooks/useCompletedGamesPersistence";
import { useInProgressGamePersistence } from "../../persistence/hooks/useInProgressGamePersistence";
import type { PersistedGame } from "@/persistence/types";
import { useSession } from "@/state/session/SessionProvider";

import { useLoginReconcileInProgressGame } from "./hooks/useLoginReconcileInProgressGame";
import { useSelector } from "react-redux";
import {
  selectSessionPhase,
  selectHistory,
  selectMoves,
  selectCursor,
  selectMoveCount,
  selectRules,
  selectUndosRemaining
} from "./";
import { selectStartedAtMs } from "../session";

type UiResets = {
  resetDrag?: () => void;
  stopAutoComplete?: () => void;
};

type GameContextValue = {
  sessionReady: boolean;
  state: GameState;
  dispatchMove: (move: Move) => void;
  registerUiResets: (handlers: UiResets | null) => void;
  restart: () => void;
  newDeal: () => void;
  replaySeed: (seed: string) => void;
  startBySeed: (seed: string) => void;
  undo: () => void;
  undoLimit: UndoLimit;
  setUndoLimit: (next: UndoLimit) => void;
  undosRemaining: number; // Infinity when unlimited
  showTimer: boolean;
  setShowTimer: (next: boolean) => void;
  timeElapsedMs: number;
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
  // UI settings (localStorage)
  // ---------------------------------------------------------------------------
  const { showTimer, setShowTimer, undoLimit, setUndoLimit } =
    useGameSettings();

  const rules = useSelector(selectRules);

  const [checkpoint, setCheckpoint] = useState<{
    at: number;
    state: GameState;
  } | null>(null);

  // ---------------------------------------------------------------------------
  // History / engine state
  // ---------------------------------------------------------------------------

  const history = useSelector(selectHistory);
  const moves = useSelector(selectMoves);
  const cursor = useSelector(selectCursor);
  const moveCount = useSelector(selectMoveCount);
  const startedAtMs = useSelector(selectStartedAtMs);
  const undosRemaining = useSelector(selectUndosRemaining);

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

  // ---------------------------------------------------------------------------
  // Undo analytics
  // ---------------------------------------------------------------------------

  // Track previous rules for rule-change effect
  const prevUidRef = useRef<string | null>(uid);

  const sessionPhase = useSelector(selectSessionPhase);
  const sessionReady = sessionPhase === "ready";

  // ---------------------------------------------------------------------------
  // Session (seed/gameId + init/reseed choreography)
  // ---------------------------------------------------------------------------
  const { seed, gameId, startNewDealSession, replaySeed } = useGameSession({
    rules,
    setTimeElapsedMs,
    setCheckpoint
  });

  const startNewDealSessionWithResets = useCallback(() => {
    uiResetsRef.current?.stopAutoComplete?.();
    uiResetsRef.current?.resetDrag?.();
    startNewDealSession();
  }, [startNewDealSession]);

  const replaySeedWithResets = useCallback(
    (nextSeed: string) => {
      uiResetsRef.current?.stopAutoComplete?.();
      uiResetsRef.current?.resetDrag?.();
      replaySeed(nextSeed);
    },
    [replaySeed]
  );

  const registerUiResets = useCallback((handlers: UiResets | null) => {
    uiResetsRef.current = handlers;
  }, []);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  useInProgressGamePersistence({
    readyToHydrate: !!gameId && !!seed,
    uid,
    gameId,
    seed,
    rules,
    moves,
    cursor,
    timeElapsedMsRef,
    moveCount,
    setTimeElapsedMs
  });

  useLoginReconcileInProgressGame({
    uid,
    sessionReady,
    currentSeed: seed,
    currentGameId: gameId
  });

  // When the user logs out, reset to a fresh guest deal ONCE (on uid transition).
  // IMPORTANT: Don't key off `uid === null && startedAtMs` because `startedAtMs` becomes true
  // on the first guest move and would cause an infinite redeal loop.
  useEffect(() => {
    if (sessionPhase !== "ready") return;

    const prevUid = prevUidRef.current;
    const didJustLogout = prevUid !== null && uid === null;

    // Keep the ref updated every run.
    prevUidRef.current = uid;

    if (!didJustLogout) return;

    // Only reset if the session we just logged out of had actually started.
    if (!startedAtMs) return;

    // Defer state updates to avoid synchronous setState-in-effect warnings.
    queueMicrotask(() => {
      startNewDealSession();
    });
  }, [uid, sessionPhase, startedAtMs, startNewDealSession]);

  // ---------------------------------------------------------------------------
  // Timer loop
  // ---------------------------------------------------------------------------
  useGameTimer({
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

    setCheckpoint,
    setCompletedGames,

    timeElapsedMs,

    startNewDealSession: startNewDealSessionWithResets,
    replaySeed: replaySeedWithResets
  });

  const newDealRef = useRef(newDeal);

  useEffect(() => {
    newDealRef.current = newDeal;
  }, [newDeal]);

  // ---------------------------------------------------------------------------
  // Snapshot logging
  // ---------------------------------------------------------------------------
  useGameSnapshotLogger({
    gameId,
    seed,
    state: history.present,
    moveCount,
    timeElapsedMs,
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
    dispatchMove,
    registerUiResets,
    restart,
    newDeal,
    replaySeed,
    startBySeed,
    undo,
    undoLimit,
    setUndoLimit,
    undosRemaining,
    showTimer,
    setShowTimer,
    timeElapsedMs,
    moveCount,
    gameId,
    completedGames
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
