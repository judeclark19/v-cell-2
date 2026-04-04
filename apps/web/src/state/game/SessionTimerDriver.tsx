import { useSessionTimer } from "../session/hooks/useSessionTimer";

function SessionTimerDriver() {
  useSessionTimer();
  return null;
}

export default SessionTimerDriver;
