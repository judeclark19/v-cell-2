"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef
} from "react";
import { useGameSnapshotLogger } from "./hooks/useGameSnapshotLogger";
import type { GameState, Move } from "@vcell/engine";
import { useGameSession } from "./hooks/useGameSession";
import { useGameActions } from "./hooks/useGameActions";
import { useCompletedGamesPersistence } from "../../persistence/hooks/useCompletedGamesPersistence";

import { useLoginReconcileInProgressGame } from "./hooks/useLoginReconcileInProgressGame";
import { useDispatch, useSelector } from "react-redux";
import {
  selectHistory,
  selectMoves,
  selectCursor,
  selectMoveCount,
  selectRules,
  selectUndosRemaining,
  selectSeed
} from "./gameSlice";
import {
  selectSessionPhase,
  selectStartedAtMs,
  selectSessionId
} from "../session/sessionSlice";
import SessionTimerDriver from "./SessionTimerDriver";
import InProgressPersistenceDriver from "./InProgressPersistenceDriver";
import { AppDispatch } from "../reduxStore";
import { initializeSettingsFromStorage } from "../ui/thunks/initializeSettingsFromStorage";
import { useGameModel } from "./hooks/useGameModel_new";
import { selectUid } from "../auth/authSlice";

type UiResets = {
  resetDrag?: () => void;
  stopAutoComplete?: () => void;
};

type GameContextValue = {
  state: GameState;
  makeMove: (move: Move) => void;
  registerUiResets: (handlers: UiResets | null) => void;
  restart: () => void;
  newDeal: () => void;
  replaySeed: (seed: string) => void;
  startBySeed: (seed: string) => void;
  undo: () => void;
  undosRemaining: number; // Infinity when unlimited
  moveCount: number;
  sessionId: string;
};

const GameContext = createContext<GameContextValue | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within <GameProvider />");
  return ctx;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(initializeSettingsFromStorage());
  }, [dispatch]);

  // Auth state
  const uid = useSelector(selectUid);

  // Session state
  const sessionId = useSelector(selectSessionId);
  const startedAtMs = useSelector(selectStartedAtMs);

  // Game state
  const seed = useSelector(selectSeed);
  const rules = useSelector(selectRules);
  const history = useSelector(selectHistory);
  const moves = useSelector(selectMoves);
  const cursor = useSelector(selectCursor);
  const moveCount = useSelector(selectMoveCount);
  const undosRemaining = useSelector(selectUndosRemaining);

  const uiResetsRef = useRef<UiResets | null>(null);

  // const [completedGames, setCompletedGames] = useState<PersistedGame[]>([]);
  useCompletedGamesPersistence();

  // ---------------------------------------------------------------------------
  // Undo analytics
  // ---------------------------------------------------------------------------

  // Track previous rules for rule-change effect
  const prevUidRef = useRef<string | null>(uid);

  const sessionPhase = useSelector(selectSessionPhase);

  // ---------------------------------------------------------------------------
  // Session (seed/sessionId + init/reseed choreography)
  // ---------------------------------------------------------------------------
  const { replaySeed, startNewDealSession } = useGameSession();

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

  useLoginReconcileInProgressGame();

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
      startNewDealSessionWithResets();
    });
  }, [uid, sessionPhase, startedAtMs, startNewDealSessionWithResets]);

  // ---------------------------------------------------------------------------
  // THE NEW STUFF! :)
  // ---------------------------------------------------------------------------
  // const { makeMove, undo, restart } = useGameModel();

  // --------------------------(NEW STUFF ENDS)---------------------------------

  const { newDeal, startBySeed } = useGameActions({
    startNewDealSessionWithResets,
    replaySeed: replaySeedWithResets
  });

  // ---------------------------------------------------------------------------
  // Snapshot logging
  // ---------------------------------------------------------------------------
  useGameSnapshotLogger();

  // ---------------------------------------------------------------------------
  // Context value
  // ---------------------------------------------------------------------------
  const value: GameContextValue = {
    state: history.present,
    makeMove: () => {
      console.log("GameProvider makeMove");
    },
    registerUiResets,
    restart: () => {
      console.log("GameProvider restart");
    },
    newDeal,
    replaySeed,
    startBySeed,
    undo: () => {
      console.log("GameProvider undo");
    },
    undosRemaining,
    moveCount,
    sessionId
  };

  return (
    <GameContext.Provider value={value}>
      <SessionTimerDriver />
      <InProgressPersistenceDriver
        readyToHydrate={!!sessionId && !!seed}
        rules={rules}
        moves={moves}
        cursor={cursor}
        moveCount={moveCount}
        uid={uid}
        seed={seed}
      />
      {children}
    </GameContext.Provider>
  );
}
