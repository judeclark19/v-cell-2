import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  BoardControlsStyle,
  Button,
  Input,
  SeedControlRoot,
  SeedMenu
} from "@vcell/ui";
import { selectSeed, selectStatus } from "@/state/game/gameSlice";
import { AppDispatch } from "@/state/reduxStore";
import { selectStartedAtMs } from "@/state/session/sessionSlice";
import { requestConfirmation } from "@/state/ui/requestConfirmation";
import { useBoardControlSystem } from "../board-control/useBoardControlSystem";
import { toggleSettingsModal } from "@/state/ui/uiSlice";

import { Shuffle, Settings, Sprout } from "lucide-react";
import SeedButton from "@/ui/SeedButton";

export default function BoardControls({
  boardController
}: {
  boardController: ReturnType<typeof useBoardControlSystem>;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const seedControlRef = useRef<HTMLDivElement | null>(null);
  const seedButtonRef = useRef<HTMLButtonElement | null>(null);
  const [seedInput, setSeedInput] = useState("");
  const [seedMenuOpen, setSeedMenuOpen] = useState(false);

  // Session state
  const startedAtMs = useSelector(selectStartedAtMs);

  // Game state
  const status = useSelector(selectStatus);
  const seed = useSelector(selectSeed);

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
    boardController.startBySeed(seed);
    setSeedInput("");
    setSeedMenuOpen(false);
  };

  useEffect(() => {
    if (!seedMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        seedControlRef.current?.contains(event.target)
      ) {
        return;
      }

      setSeedMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      setSeedMenuOpen(false);
      seedButtonRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [seedMenuOpen]);

  return (
    <BoardControlsStyle>
      {/* <Button onClick={onNewDeal}>New deal</Button> */}

      <Button type="button" onClick={onNewDeal} title="New deal">
        <Shuffle aria-hidden="true" size={28} />
      </Button>

      <SeedControlRoot ref={seedControlRef}>
        <SeedMenu id="seed-menu" open={seedMenuOpen}>
          <p
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
              marginBottom: "1rem"
            }}
          >
            Current&nbsp;seed:{" "}
            {seed ? <SeedButton seed={seed ?? "(unknown)"} /> : "(unknown)"}
          </p>
          <form
            className="row"
            onSubmit={(event) => {
              event.preventDefault();
              const newSeed = seedInput.trim();
              if (!newSeed) return;
              startBySeed(newSeed);
            }}
          >
            <Input
              id="seed-menu-input"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="Enter seed..."
              value={seedInput}
              onChange={(event) => setSeedInput(event.target.value)}
              aria-label="Seed"
              name="seed-menu-input"
              style={{ flex: "1 1 auto" }}
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={!seedInput.trim()}
            >
              Play
            </Button>
          </form>
          <p
            className="hint"
            style={{
              marginTop: "0.75rem",
              textAlign: "center"
            }}
          >
            Playing a seed starts a new game and abandons the current one.
          </p>
        </SeedMenu>
        <Button
          ref={seedButtonRef}
          type="button"
          active={seedMenuOpen}
          aria-controls="seed-menu"
          aria-expanded={seedMenuOpen}
          aria-haspopup="dialog"
          aria-label={seedMenuOpen ? "Close seed menu" : "Open seed menu"}
          onClick={() => setSeedMenuOpen((open) => !open)}
          title="Seed"
        >
          <Sprout aria-hidden="true" size={28} />
        </Button>
      </SeedControlRoot>

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
