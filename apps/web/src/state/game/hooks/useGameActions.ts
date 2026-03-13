import { useCallback } from "react";

import { getOrCreateDeviceId } from "@/persistence/schema";
import { deleteInProgressGameForDevice } from "@/persistence/inProgressGamesStore";
import { abandonCurrentGame } from "@/state/game/thunks/abandonCurrentGame";

import { useDispatch, useSelector } from "react-redux";

import { AppDispatch } from "@/state/reduxStore";
import { selectUid } from "@/state/auth/authSlice";

export type UseGameActionsParams = {
  // Session transition
  startNewDealSessionWithResets: () => void;
  replaySeed: (seed: string) => void;
};

export type UseGameActionsResult = {
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
  const dispatch = useDispatch<AppDispatch>();

  const uid = useSelector(selectUid);

  const transitionAwayFromCurrentGame = useCallback(
    (startNext: () => void) => {
      dispatch(abandonCurrentGame({ uid }));

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

  return { newDeal, startBySeed };
}
