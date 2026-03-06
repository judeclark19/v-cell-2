export { bootSession } from "./thunks/bootSession";
export { applyRulesChangeStartNewDeal } from "./thunks/applyRulesChange_startNewDeal";

export { ensureSessionStarted } from "./thunks/ensureSessionStarted";
export {
  selectSessionKey,
  selectSessionKeyString,
  selectRules,
  selectStartedAtMs,
  selectEndedAtMs
} from "./selectors_new";
export type { SessionKey } from "./selectors_new";

// Session may import Game actions
export { setStartedAtMs, setEndedAtMs } from "@/state/game";

export { sessionReducer } from "./sessionSlice";
