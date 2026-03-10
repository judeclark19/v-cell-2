import { useInProgressGamePersistence } from "@/persistence/hooks/useInProgressGamePersistence";
import { Move, Rules } from "@vcell/engine";

function InProgressPersistenceDriver(props: {
  readyToHydrate: boolean;
  rules: Rules;
  moves: Move[];
  cursor: number;
  moveCount: number;
  uid: string | null;
  seed: string;
}) {
  useInProgressGamePersistence(props);
  return null;
}

export default InProgressPersistenceDriver;
