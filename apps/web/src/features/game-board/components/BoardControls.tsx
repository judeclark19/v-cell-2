import { useDispatch, useSelector } from "react-redux";
import { BoardControlsStyle, Button } from "@vcell/ui";
import { selectStatus } from "@/state/game/gameSlice";
import { AppDispatch } from "@/state/reduxStore";
import { selectStartedAtMs } from "@/state/session/sessionSlice";
import { requestConfirmation } from "@/state/ui/requestConfirmation";
import { useBoardControlSystem } from "../board-control/useBoardControlSystem";
import { toggleSettingsModal } from "@/state/ui/uiSlice";

import { Shuffle, Settings, KeyRound } from "lucide-react";

export default function BoardControls({
  boardController
}: {
  boardController: ReturnType<typeof useBoardControlSystem>;
}) {
  const dispatch = useDispatch<AppDispatch>();

  // Session state
  const startedAtMs = useSelector(selectStartedAtMs);

  // Game state
  const status = useSelector(selectStatus);

  const onNewDeal = async () => {
    const ok =
      !(startedAtMs && status === "in_progress") ||
      (await requestConfirmation({
        title: "Start a new deal?",
        bodyText: "Starting a new deal will abandon your current game.",
        confirmLabel: "New deal",
        cancelLabel: "Cancel"
      }));
    if (!ok) return;

    boardController.newDeal();
  };

  const startBySeed = async (seed: string) => {
    const ok =
      !(startedAtMs && status === "in_progress") ||
      (await requestConfirmation({
        title: "Start a seeded deal?",
        bodyText: "Starting this seeded deal will abandon your current game.",
        confirmLabel: "Start",
        cancelLabel: "Cancel"
      }));
    if (!ok) return;

    boardController.startBySeed(seed);
  };

  return (
    <BoardControlsStyle>
      {/* <Button onClick={onNewDeal}>New deal</Button> */}

      <Button type="button" onClick={onNewDeal} title="New deal">
        <Shuffle aria-hidden="true" size={28} />
      </Button>

      <Button type="button" onClick={() => {}} title="Seed">
        <KeyRound aria-hidden="true" size={28} />
      </Button>

      <Button
        type="button"
        onClick={() => dispatch(toggleSettingsModal())}
        title="Settings"
      >
        <Settings aria-hidden="true" size={28} />
      </Button>
    </BoardControlsStyle>
  );
}
