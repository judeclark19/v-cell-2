// apps/web/src/state/session/selectors.ts
import type { RootState } from "@/state/reduxStore";
import { Rules } from "@vcell/engine";

// If SessionPhase is just a string union in game slice, import it from there.

export type SessionKey = {
  seed: string;
  sessionId: string;
};

export function selectSessionKey(state: RootState): SessionKey {
  return { seed: state.game.seed, sessionId: state.session.sessionId };
}

export function selectRules(state: RootState): Rules {
  return state.game.rules;
}

// Convenience:
export function selectSessionKeyString(state: RootState): string {
  const { seed, sessionId } = selectSessionKey(state);
  return `${seed}:${sessionId}`;
}
