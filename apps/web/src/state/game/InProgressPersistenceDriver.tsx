import { useInProgressGamePersistence } from "@/persistence/hooks/useInProgressGamePersistence";
import { Move, Rules } from "@vcell/engine";

function InProgressPersistenceDriver(props: {
  readyToHydrate: boolean;
  uid: string | null;
  seed: string;
  rules: Rules;
  moves: Move[];
  cursor: number;
  moveCount: number;
}) {
  useInProgressGamePersistence(props);
  return null;
}

export default InProgressPersistenceDriver;
