//“Do we actually start a session, or is it already the same one?”

import { startGame } from "@/state/game/gameSlice";
import { selectSessionKey } from "@/state/session/selectors_new";
import {
  selectSessionPhase,
  setCheckpoint,
  setEndedAtMs,
  setSessionId,
  setPaused,
  setStartedAtMs
} from "@/state/session/sessionSlice";
import { RootState } from "../reduxStore";
import { Rules } from "@vcell/engine";
import { setSessionPhase, setTimeElapsedMs } from "./sessionSlice";

type Params = {
  seed: string;
  sessionId: string;
  rules: Rules;
};

export async function transitionSession(
  { seed, sessionId, rules }: Params,
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

  const isSame = current?.seed === seed && current?.sessionId === sessionId;

  if (isSame && phase !== "boot") {
    return {
      kind: "noop" as const,
      reason: `already on ${seed}:${sessionId} (phase=${phase})`
    };
  }

  dispatch(
    startGame({
      seed,
      rules
    })
  );

  dispatch(setSessionPhase("hydrating"));
  dispatch(setPaused(false));
  dispatch(setStartedAtMs(null));
  dispatch(setEndedAtMs(null));
  dispatch(setSessionId(sessionId));
  dispatch(setTimeElapsedMs(0));
  dispatch(setCheckpoint(null));

  dispatch(setSessionPhase("ready"));

  return {
    kind: "started" as const,
    seed,
    sessionId
  };
}
