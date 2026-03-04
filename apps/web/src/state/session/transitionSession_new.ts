//“Do we actually start a session, or is it already the same one?”

import { startSession } from "@/state/game/gameStore_new";
import { selectSessionKey, selectSessionPhase } from "@/state/session";
import { RootState } from "../reduxStore";
import { Rules } from "@vcell/engine";

type Params = {
  seed: string;
  gameId: string;
  rules: Rules;
};

export async function transitionSession(
  { seed, gameId, rules }: Params,
  {
    getState,
    dispatch
  }: {
    getState: () => RootState;
    dispatch: (action: unknown) => unknown;
  }
) {
  const state = getState();

  const current = selectSessionKey(state);
  const phase = selectSessionPhase(state);

  const isSame = current?.seed === seed && current?.gameId === gameId;

  if (isSame && phase !== "boot") {
    return {
      kind: "noop" as const,
      reason: `already on ${seed}:${gameId} (phase=${phase})`
    };
  }

  dispatch(
    startSession({
      seed,
      gameId,
      rules
    })
  );

  return {
    kind: "started" as const,
    seed,
    gameId
  };
}
