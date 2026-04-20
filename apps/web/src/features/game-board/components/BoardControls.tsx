import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Field, Input, Panel, Select } from "@vcell/ui";
import { selectRules, selectStatus } from "@/state/game/gameSlice";
import { requestRulesChange } from "@/state/session/thunks/requestRulesChange";
import { AppDispatch } from "@/state/reduxStore";
import { selectStartedAtMs } from "@/state/session/sessionSlice";
import { requestConfirmation } from "@/state/ui/requestConfirmation";
import { parseFaceDownCount, parseUndoLimit } from "@/ui/utils";
import { selectUid } from "@/state/auth/authSlice";
import { useBoardControlSystem } from "../board-control/useBoardControlSystem";
import Or from "@/ui/Or";

export default function BoardControls({
  boardController
}: {
  boardController: ReturnType<typeof useBoardControlSystem>;
}) {
  const dispatch = useDispatch<AppDispatch>();

  // Auth state
  const uid = useSelector(selectUid);

  // Session state
  const startedAtMs = useSelector(selectStartedAtMs);

  // Game state
  const rules = useSelector(selectRules);
  const status = useSelector(selectStatus);

  // local state
  const [seedInput, setSeedInput] = useState("");

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
    <div>
      <Panel
        as="section"
        padding="lg"
        aria-label="Start a new game"
        style={{ marginBottom: "2rem" }}
      >
        <h2>Start a new game</h2>
        {/* <p className="hint" style={{ marginBottom: "1em" }}>
          Starting a new game abandons the current one.
        </p> */}

        <Button type="button" fullWidth onClick={onNewDeal}>
          New deal (random)
        </Button>

        <Or />
        <div>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!seedInput.trim()) return;
              startBySeed(seedInput);
              setSeedInput("");
            }}
          >
            <Input
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="Enter a specific seed…"
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              aria-label="Seed"
              name="seed-input"
              id="seed-input"
              // fullWidth
              style={{ flex: "1 1 auto" }}
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={!seedInput.trim()}
            >
              Play seed
            </Button>
          </form>
        </div>
      </Panel>

      <Panel as="section" padding="lg" aria-label="Gameplay settings">
        <h2>Gameplay</h2>
        <p className="hint" style={{ marginBottom: "1em" }}>
          Changing any gameplay setting starts a new game and abandons the
          current one.
        </p>
        <div className="grid">
          <Field
            label="Face-down cards at deal"
            hint="Engine rule: V-shape layering. Auto-flip when a face-down card becomes exposed."
          >
            <Select
              id="face-down-cards"
              value={String(rules.faceDownCount)}
              onChange={async (e) => {
                const next = parseFaceDownCount(e.target.value);
                if (next === rules.faceDownCount) return;
                await dispatch(
                  requestRulesChange({
                    patch: { ...rules, faceDownCount: next },
                    uid
                  })
                ).unwrap();
              }}
            >
              <option value="0">0 (all face-up)</option>
              <option value="7">7 (classic)</option>
              <option value="14">14 (2 rows)</option>
              <option value="21">21 (3 rows)</option>
            </Select>
          </Field>

          <Field
            label="Undo limit"
            hint="For MVP we can enforce in UI; later we can also record undos used for stats."
          >
            <Select
              id="undo-limit"
              value={String(rules.undoLimit)}
              onChange={async (e) => {
                const next = parseUndoLimit(e.target.value);
                if (next === rules.undoLimit) return;
                await dispatch(
                  requestRulesChange({
                    patch: { ...rules, undoLimit: next },
                    uid
                  })
                ).unwrap();
              }}
            >
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="3">3</option>
              <option value="5">5</option>
              <option value="unlimited">Unlimited</option>
            </Select>
          </Field>

          <Field
            label="Foundation pullback"
            hint="When enabled, top foundation card can move to tableau/freecell."
          >
            <Select
              id="foundation-pullback"
              value={rules.allowFoundationPullback ? "on" : "off"}
              onChange={async (e) => {
                const next = e.target.value === "on";
                if (next === rules.allowFoundationPullback) return;
                await dispatch(
                  requestRulesChange({
                    patch: { ...rules, allowFoundationPullback: next },
                    uid
                  })
                ).unwrap();
              }}
            >
              <option value="on">On (easier)</option>
              <option value="off">Off (harder)</option>
            </Select>
          </Field>
        </div>
      </Panel>
    </div>
  );
}
