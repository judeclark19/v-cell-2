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

import { db } from "@/lib/firebaseClient";
import {
  collection,
  getDocs,
  getDocsFromServer,
  limit,
  orderBy,
  query,
  where,
  doc,
  setDoc
} from "firebase/firestore";
import {
  getInProgressGameForDevice,
  upsertInProgressGame
} from "@/persistence/inProgressGamesStore";
import { getOrCreateDeviceId } from "@/persistence/schema";

type GameContextValue = {
  state: GameState;
  isWon: boolean;
  dispatchMove: (move: Move) => void;
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
  seedReady: boolean;
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

export type HistoryState = {
  present: GameState;
  past: GameState[];
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
  const [history, setHistory] = useState<HistoryState>(() => ({
    present: createGame("seed-init", rules),
    past: []
  }));
  const state = history.present;

  const [hydratedGameId, setHydratedGameId] = useState<string | null>(null);

  const [completedGames, setCompletedGames] = useState<PersistedGame[]>([]);
  const { uid } = useSession();
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

  // ---------------------------------------------------------------------------
  // Session (seed/gameId/seedReady + init/reseed choreography)
  // ---------------------------------------------------------------------------
  const {
    seed,
    gameId,
    seedReady,
    startNewDealSession,
    replaySeed,
    startSession
  } = useGameSession({
    rules,
    allowFoundationPullback,
    undoLimit,
    faceDownCount,
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
  });

  const historyReady = seedReady && hydratedGameId === gameId;

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const { isWon, undosRemaining, canUndo } = useGameDerivedState({
    state,
    pastLength: history.past.length,
    undoLimit,
    undosUsed
  });

  const onInProgressHydrated = useCallback(
    (saved: PersistedGame | null) => {
      if (!saved) {
        setHydratedGameId(gameId);
        return;
      }

      // Rebuild history.present from persisted moves/cursor so the UI reflects
      // the actual progressed game state after refresh.
      const appliedMoves = (saved.moves ?? []).slice(0, saved.cursor ?? 0);

      let present = createGame(saved.seed, rules);
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

      setHistory({ present, past });
      setHydratedGameId(gameId);
    },
    [rules, undoLimit, gameId]
  );

  useInProgressGamePersistence({
    uid,
    seedReady,
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

  const didReconcileOnLoginRef = useRef<string | null>(null);

  useEffect(() => {
    if (!seedReady) return;
    if (!uid) return;

    // Only run once per uid per page load.
    if (didReconcileOnLoginRef.current === uid) return;
    didReconcileOnLoginRef.current = uid;

    let cancelled = false;

    (async () => {
      const deviceId = getOrCreateDeviceId();

      // 1) Check cloud for an in-progress game for THIS device.
      const gamesCol = collection(db, "users", uid, "games");
      const q = query(
        gamesCol,
        where("status", "==", "in_progress"),
        where("deviceId", "==", deviceId),
        orderBy("updatedAtMs", "desc"),
        limit(1)
      );

      let snap;
      try {
        // IMPORTANT: avoid Firestore's local cache here; we want server truth for login reconciliation.
        snap = await getDocsFromServer(q);
      } catch (err) {
        // If offline / blocked, fall back to the default behavior.
        console.warn(
          "[login reconcile] getDocsFromServer failed; falling back to getDocs",
          err
        );
        snap = await getDocs(q);
      }
      if (cancelled) return;

      const cloudDoc = snap.docs[0];

      if (cloudDoc) {
        // Cloud wins: hydrate local, then switch the running session to it.
        const raw = cloudDoc.data() as PersistedGame;
        const cloudGameId = (raw.gameId as string | undefined) ?? cloudDoc.id;

        const payload: PersistedGame = {
          ...(raw as PersistedGame),
          gameId: cloudGameId,
          deviceId,
          userId: uid
        };

        // Put it in IndexedDB so the normal hydration path can rebuild history/moves.
        await upsertInProgressGame(payload);

        if (cancelled) return;

        // Force the active session to match the cloud record.
        setHydratedGameId(null);
        startSession({
          kind: "seed+id",
          seed: payload.seed,
          gameId: payload.gameId
        });

        return;
      }

      // 2) No cloud in-progress for this device:
      // Attribute the current local in-progress game to the user and push once.
      const local = await getInProgressGameForDevice(deviceId);

      if (cancelled) return;
      if (!local) return;

      // Only push if it’s actually an active in-progress game.
      if (local.status !== "in_progress") return;
      if (!local.hasStarted) return;

      const payload: PersistedGame = {
        ...local,
        deviceId,
        userId: uid
      };

      await upsertInProgressGame(payload);
      if (cancelled) return;

      // Push ONCE on login (your per-second persistence does not write to Firestore).
      await setDoc(doc(db, "users", uid, "games", payload.gameId), payload, {
        merge: true
      });
    })().catch((err) => {
      console.error("[login reconcile] failed", err);
    });

    return () => {
      cancelled = true;
    };
  }, [uid, seedReady, startSession]);

  // ---------------------------------------------------------------------------
  // Timer loop
  // ---------------------------------------------------------------------------
  useGameTimer({
    paused,
    seedReady,
    hasStarted,
    isWon,
    isAbandoned,
    setTimeElapsedMs
  });

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const { dispatchMove, restart, newDeal, startBySeed, undo } = useGameActions({
    state,
    history,
    setHistory,

    seed,
    gameId,
    rules,
    undoLimit,

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

    startNewDealSession,
    replaySeed
  });

  const newDealRef = useRef(newDeal);

  useEffect(() => {
    newDealRef.current = newDeal;
  }, [newDeal]);

  // ---------------------------------------------------------------------------
  // Rule changes => abandon + archive current game, then start a new deal
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!seedReady) return;

    // Skip initial mount (otherwise we'd immediately newDeal after boot).
    if (!didApplyRuleChangeOnceRef.current) {
      didApplyRuleChangeOnceRef.current = true;
      return;
    }

    // This will archive the current game if it has started, then start a new session.
    newDealRef.current();
  }, [seedReady, allowFoundationPullback, undoLimit, faceDownCount]);

  // ---------------------------------------------------------------------------
  // Snapshot logging
  // ---------------------------------------------------------------------------
  useGameSnapshotLogger({
    gameId,
    seed,
    state,
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
    state,
    isWon,
    dispatchMove,
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
    seedReady,
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
