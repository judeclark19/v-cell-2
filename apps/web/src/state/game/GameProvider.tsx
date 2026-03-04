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
import { useDispatch, useSelector } from "react-redux";
import {
  selectSessionPhase,
  selectHistory,
  selectMoves,
  selectCursor,
  selectMoveCount,
  hydrateFromPersisted,
  finalizeHydration
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
  const moves = useSelector(selectMoves);
  const cursor = useSelector(selectCursor);
  const moveCount = useSelector(selectMoveCount);
  const dispatch = useDispatch();

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

  // Track previous rules for rule-change effect
  const prevRulesRef = useRef<{
    allowFoundationPullback: boolean;
    undoLimit: UndoLimit;
    faceDownCount: Rules["faceDownCount"];
  } | null>(null);
  const prevUidRef = useRef<string | null>(uid);

  const sessionPhase = useSelector(selectSessionPhase);
  const sessionReady = sessionPhase === "ready";

  // ---------------------------------------------------------------------------
  // Session (seed/gameId + init/reseed choreography)
  // ---------------------------------------------------------------------------
  const { seed, gameId, startNewDealSession, replaySeed, startSession } =
    useGameSession({
      rules,
      setTimeElapsedMs,
      setHasStarted,
      setStartedAtMs,
      setEndedAtMs,
      setIsAbandoned,
      setUndosUsed,
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
    uiResetsRef.current?.stopAutoComplete?.();
    uiResetsRef.current?.resetDrag?.();
    startNewDealSession();
  }, [startNewDealSession]);

  const replaySeedWithResets = useCallback(
    (nextSeed: string) => {
      startSessionWithResets({ kind: "seed", seed: nextSeed });
    },
    [startSessionWithResets]
  );

  const registerUiResets = useCallback((handlers: UiResets | null) => {
    uiResetsRef.current = handlers;
  }, []);

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
        return;
      }

      dispatch(
        hydrateFromPersisted({
          gameId: saved.gameId,
          seed: saved.seed,
          rules: saved.rules,
          moves: saved.moves,
          cursor: saved.cursor,
          fallbackRules: rules,
          undoLimit
        })
      );
    },
    [rules, undoLimit, dispatch]
  );

  useInProgressGamePersistence({
    readyToHydrate: !!gameId && !!seed,
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

    setTimeElapsedMs,
    setHasStarted,
    setStartedAtMs,
    setEndedAtMs,
    setIsAbandoned,
    setPaused,
    setUndosUsed
  });

  useLoginReconcileInProgressGame({
    uid,
    startSession: startSessionWithResets,
    sessionReady,
    currentSeed: seed,
    currentGameId: gameId
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
      startNewDealSession();
    });
  }, [uid, sessionPhase, hasStarted, startNewDealSession, dispatch]);

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
    if (!sessionReady) return;

    const currentRules = {
      allowFoundationPullback,
      undoLimit,
      faceDownCount
    };

    // First run: just record rules.
    if (prevRulesRef.current === null) {
      prevRulesRef.current = currentRules;
      return;
    }

    const prev = prevRulesRef.current;

    const rulesChanged =
      prev.allowFoundationPullback !== currentRules.allowFoundationPullback ||
      prev.undoLimit !== currentRules.undoLimit ||
      prev.faceDownCount !== currentRules.faceDownCount;

    if (!rulesChanged) return;

    prevRulesRef.current = currentRules;

    newDealRef.current();
  }, [sessionReady, allowFoundationPullback, undoLimit, faceDownCount]);

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

  // console.log("GameProvider render", {
  //   uid,
  //   sessionPhase,
  //   seed,
  //   gameId,
  //   present: !!history.present,
  //   movesLen: moves.length,
  //   cursor,
  //   moveCount
  // });

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
