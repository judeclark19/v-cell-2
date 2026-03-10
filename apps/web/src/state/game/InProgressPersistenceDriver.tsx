import { useInProgressGamePersistence } from "@/persistence/hooks/useInProgressGamePersistence";
import { Move, Rules } from "@vcell/engine";
import { useSession } from "../session/SessionProvider";
import { useSelector } from "react-redux";
import { selectSeed } from "./gameSlice";

function InProgressPersistenceDriver(props: {
  readyToHydrate: boolean;
  rules: Rules;
  moves: Move[];
  cursor: number;
  moveCount: number;
}) {
  const { uid } = useSession();

  // game state
  const seed = useSelector(selectSeed);
  useInProgressGamePersistence({
    uid,
    seed,
    ...props
  });
  return null;
}

export default InProgressPersistenceDriver;
