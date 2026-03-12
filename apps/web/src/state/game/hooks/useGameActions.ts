import { useCallback } from "react";
import { createGame } from "@vcell/engine";
import { getOrCreateDeviceId } from "@/persistence/schema";
import { deleteInProgressGameForDevice } from "@/persistence/inProgressGamesStore";
import { abandonCurrentGameIfNeeded } from "@/state/game/thunks/abandonCurrentGameIfNeeded";

import {
  hydrateHistory,
  resetTimeline,
  selectSeed,
  setUndosUsed,
  setStatus
} from "@/state/game/gameSlice";

import { useDispatch, useSelector } from "react-redux";
import { setEndedAtMs, setCheckpoint } from "@/state/session/sessionSlice";

import { AppDispatch } from "@/state/reduxStore";
import { useSession } from "@/auth/AuthProvider";
import { selectRules } from "@/state/session/selectors_new";

export type UseGameActionsParams = {
  // Session transition
  startNewDealSessionWithResets: () => void;
  replaySeed: (seed: string) => void;
};

export type UseGameActionsResult = {
  restart: () => void;
  newDeal: () => void;
  startBySeed: (seed: string) => void;
};

/**
 * Owns the game "actions" (moves, undo, restart, new deal) and the bookkeeping
 * that goes with them.
 *
 * This is intentionally a mechanical extraction from GameProvider.
 */
export function useGameActions({
  startNewDealSessionWithResets,
  replaySeed
}: UseGameActionsParams): UseGameActionsResult {
  const { uid } = useSession();

  const dispatch = useDispatch<AppDispatch>();

  // Game state
  const seed = useSelector(selectSeed);
  const rules = useSelector(selectRules);

  const restart = useCallback(() => {
    // Restart should reset the deal back to its original position and clear history,
    // but it should NOT affect the timer.
    dispatch(hydrateHistory({ present: createGame(seed, rules), past: [] }));
    dispatch(resetTimeline());
    dispatch(setUndosUsed(0));
    dispatch(setCheckpoint(null));
    dispatch(setEndedAtMs(null));
    dispatch(setStatus("in_progress"));
  }, [seed, rules, dispatch]);

  const transitionAwayFromCurrentGame = useCallback(
    (startNext: () => void) => {
      dispatch(abandonCurrentGameIfNeeded({ uid }));

      const deviceId = getOrCreateDeviceId();
      deleteInProgressGameForDevice(deviceId).catch(() => {});

      startNext();
    },
    [dispatch, uid]
  );

  const newDeal = useCallback(() => {
    transitionAwayFromCurrentGame(startNewDealSessionWithResets);
  }, [transitionAwayFromCurrentGame, startNewDealSessionWithResets]);

  const startBySeed = useCallback(
    (nextSeed: string) => {
      const normalized = nextSeed.trim();
      if (!normalized) return;

      transitionAwayFromCurrentGame(() => {
        replaySeed(normalized);
      });
    },
    [transitionAwayFromCurrentGame, replaySeed]
  );

  return { restart, newDeal, startBySeed };
}
