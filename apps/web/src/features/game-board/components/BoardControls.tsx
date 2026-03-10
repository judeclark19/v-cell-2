import { useState } from "react";
import { UndoLimit } from "@vcell/engine";
import { useDispatch, useSelector } from "react-redux";
import { selectRules } from "@/state/game/gameSlice";
import { requestRulesChange } from "@/state/session/thunks/requestRulesChange";
import { AppDispatch } from "@/state/reduxStore";
import { useSession } from "@/state/session/SessionProvider";

type BoardControlsProps = {
  onNewDeal: () => void;
  startBySeed: (seed: string) => void;
};

const parseFaceDownCount = (value: string): 0 | 7 | 14 | 21 => {
  const n = Number(value);
  if (n === 0 || n === 7 || n === 14 || n === 21) return n;
  return 7;
};

const parseUndoLimit = (value: string): UndoLimit => {
  if (value === "unlimited") return "unlimited";
  const n = Number(value);
  if (n === 0 || n === 1 || n === 3 || n === 5) return n as UndoLimit;
  return "unlimited";
};

export default function BoardControls({
  onNewDeal,
  startBySeed
}: BoardControlsProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { uid } = useSession();
  const [seedInput, setSeedInput] = useState("");
  const rules = useSelector(selectRules);

  return (
    <>
      <section className="control" aria-label="Start a new game">
        <h2>Start a new game</h2>
        {/* <p className="hint" style={{ marginBottom: "1em" }}>
          Starting a new game abandons the current one.
        </p> */}

        <div className="row">
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
              <input
                className="control"
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="Enter a specific seed…"
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                aria-label="Seed"
                name="seed-input"
                id="seed-input"
              />
              <button
                type="submit"
                className="btn btn--secondary"
                disabled={!seedInput.trim()}
              >
                Play seed
              </button>
            </form>
          </div>
          <div
            aria-hidden="true"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--muted)",
              fontSize: 14,
              width: 70
            }}
          >
            <span
              style={{
                flex: 1,
                height: 1,
                background: "currentColor",
                opacity: 0.3
              }}
            />
            <span>or</span>
            <span
              style={{
                flex: 1,
                height: 1,
                background: "currentColor",
                opacity: 0.3
              }}
            />
          </div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={onNewDeal}
          >
            New deal (random)
          </button>
        </div>
      </section>
      <section className="control">
        <h2>Gameplay</h2>
        <p className="hint" style={{ marginBottom: "1em" }}>
          Changing any gameplay setting starts a new game and abandons the
          current one.
        </p>
        <div className="grid">
          <label className="field">
            Face-down cards at deal
            <select
              className="control"
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
            </select>
            <small className="hint">
              Engine rule: V-shape layering. Auto-flip when a face-down card
              becomes exposed.
            </small>
          </label>

          <label className="field">
            Undo limit
            <select
              className="control"
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
            </select>
            <small className="hint">
              For MVP we can enforce in UI; later we can also record undos used
              for stats.
            </small>
          </label>

          <label className="field">
            Foundation pullback
            {/* TODO: when foundation pullback is turned off, the right click/context menu should NOT try auto foundation */}
            <select
              className="control"
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
            </select>
            <small className="hint">
              When enabled, top foundation card can move to tableau/freecell.
            </small>
          </label>
        </div>
      </section>
    </>
  );
}
