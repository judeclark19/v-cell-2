import ModalOverlay from "@/components/ModalOverlay";
import { PersistedGame } from "@/persistence/types";
import { selectCompletedGames } from "@/state/records/recordsSlice";
import { useMemo, useState } from "react";
import {
  selectSessionId,
  selectTimeElapsedMs,
  setPaused
} from "@/state/session/sessionSlice";
import { useDispatch, useSelector } from "react-redux";
import { selectMoveCount, selectRules } from "@/state/game/gameSlice";
import {
  closePauseModal,
  closeSettingsModal,
  closeWinModal,
  selectConfirmModal,
  selectPauseModal,
  selectSettingsModal,
  selectWinModal
} from "@/state/ui/uiSlice";
import { AppDispatch } from "@/state/reduxStore";
import { selectUid } from "@/state/auth/authSlice";
import { transitionGameAndSession } from "@/state/transitionGameAndSession";
import { Field, Select } from "@vcell/ui";
import { formatElapsed, parseFaceDownCount, parseUndoLimit } from "@/ui/utils";
import { newDealThunk } from "@/state/session/thunks/newDeal";
import { areRulesEqual } from "@/state/game/utils";
import type { Rules } from "@vcell/engine";
import { useRouteTransitionRouter } from "@/ui/RouteTransition";

export type ConfirmRequest = {
  title: string;
  bodyText: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

function GameSettingsModal({
  onClose,
  rules,
  uid
}: {
  onClose: () => void;
  rules: Rules;
  uid: string | null;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const [draftRules, setDraftRules] = useState<Rules>(() => rules);
  const settingsChanged = useMemo(
    () => !areRulesEqual(rules, draftRules),
    [draftRules, rules]
  );

  const applySettings = async () => {
    if (!settingsChanged) return;

    await dispatch(newDealThunk({ rules: draftRules, uid })).unwrap();
    onClose();
  };

  return (
    <ModalOverlay
      overlayAriaLabel="Game settings"
      title="Settings"
      buttonAriaLabel="Close settings"
      onClose={onClose}
      body={
        <>
          <p className="hint" style={{ marginBottom: "1em" }}>
            Adjust gameplay rules, then apply them when you are ready.
          </p>
          <div className="grid">
            <Field
              label="Face-down cards at deal"
              hint="Engine rule: V-shape layering. Auto-flip when a face-down card becomes exposed."
            >
              <Select
                id="face-down-cards"
                value={String(draftRules.faceDownCount)}
                onChange={(e) => {
                  const next = parseFaceDownCount(e.target.value);
                  setDraftRules((current) => ({
                    ...current,
                    faceDownCount: next
                  }));
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
                value={String(draftRules.undoLimit)}
                onChange={(e) => {
                  const next = parseUndoLimit(e.target.value);
                  setDraftRules((current) => ({
                    ...current,
                    undoLimit: next
                  }));
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
                value={draftRules.allowFoundationPullback ? "on" : "off"}
                onChange={(e) => {
                  const next = e.target.value === "on";
                  setDraftRules((current) => ({
                    ...current,
                    allowFoundationPullback: next
                  }));
                }}
              >
                <option value="on">On (easier)</option>
                <option value="off">Off (harder)</option>
              </Select>
            </Field>
          </div>
          <p
            className="hint"
            style={{
              marginTop: "1em",
              textAlign: "center"
            }}
          >
            Applying changes starts a new game and abandons the current one.
          </p>
        </>
      }
      primaryButtonLabel="Apply changes"
      primaryButtonAction={applySettings}
      primaryButtonDisabled={!settingsChanged}
      secondaryButtonLabel="Close"
      secondaryButtonAction={onClose}
    />
  );
}

export default function BoardModals() {
  const router = useRouteTransitionRouter();

  const dispatch = useDispatch<AppDispatch>();
  // Auth state
  const uid = useSelector(selectUid);
  const isUser = uid !== null;
  // Session state
  const sessionId = useSelector(selectSessionId);
  const timeElapsedMs = useSelector(selectTimeElapsedMs);
  const confirmReq = useSelector(selectConfirmModal);
  // Game state
  const moveCount = useSelector(selectMoveCount);
  const rules = useSelector(selectRules);
  // Records state
  const completedGames = useSelector(selectCompletedGames);
  // ui state
  const winModal = useSelector(selectWinModal);
  const pauseModal = useSelector(selectPauseModal);
  const settingsModal = useSelector(selectSettingsModal);

  const currentCompletedGame =
    completedGames.find((g) => g.sessionId === sessionId) ?? null;

  const closeSettings = () => {
    dispatch(closeSettingsModal());
  };

  function deriveWinRateLastN(games: PersistedGame[], n = 100) {
    const ended = games
      .filter((g) => typeof g.endedAtMs === "number" && g.endedAtMs)
      .slice()
      .sort((a, b) => (b.endedAtMs ?? 0) - (a.endedAtMs ?? 0));

    const lastN = ended.slice(0, n);
    const wins = lastN.filter((g) => g.status === "won").length;
    const count = lastN.length;
    const winRate =
      count === 0 ? "0" : Number(((wins / count) * 100).toFixed(2)).toString();

    return { count, wins, winRate };
  }

  const getWinBodyText = () => {
    // calculate if the current game is the best time / best moves based on completed history
    const fastest = completedGames
      .filter((g) => g.status === "won" && Number.isFinite(g.timeElapsedMs))
      .sort(
        (a, b) => (a.timeElapsedMs as number) - (b.timeElapsedMs as number)
      )[0];

    const fewestMoves = completedGames
      .filter((g) => g.status === "won" && Number.isFinite(g.moveCount))
      .sort((a, b) => (a.moveCount as number) - (b.moveCount as number))[0];

    const isNewBestTime = fastest?.sessionId === sessionId;
    const isNewBestMoves = fewestMoves?.sessionId === sessionId;

    const displayMoveCount = currentCompletedGame?.moveCount ?? moveCount;
    const displayTimeElapsedMs =
      currentCompletedGame?.timeElapsedMs ?? timeElapsedMs;
    const { wins, count, winRate } = deriveWinRateLastN(completedGames);

    let bodyText = `Moves: ${displayMoveCount} • Time: ${formatElapsed(displayTimeElapsedMs)}`;

    if (!isUser) return bodyText; // only show win rate and records to signed-in users since it's based on persisted history

    bodyText += `\nYou have won ${wins} out of your last ${count} games (${winRate}% win rate)`;

    if (isNewBestTime) {
      bodyText += "\n🎉 New record for fastest game!";
    }

    if (isNewBestMoves) {
      bodyText += "\n🎉 New record for fewest moves!";
    }

    return bodyText;
  };

  return (
    <>
      {confirmReq && (
        <ModalOverlay
          overlayAriaLabel="Confirm action"
          title={confirmReq.title}
          buttonAriaLabel="Close confirmation dialog"
          onClose={confirmReq.onCancel}
          bodyText={confirmReq.bodyText}
          primaryButtonLabel={confirmReq.confirmLabel ?? "Confirm"}
          primaryButtonAction={confirmReq.onConfirm}
          secondaryButtonLabel={confirmReq.cancelLabel ?? "Cancel"}
          secondaryButtonAction={confirmReq.onCancel}
        />
      )}

      {pauseModal && (
        <ModalOverlay
          overlayAriaLabel="Game paused"
          title="Paused"
          buttonAriaLabel="Resume game"
          onClose={() => {
            dispatch(closePauseModal());
            dispatch(setPaused(false));
          }}
          bodyText="Timer is paused. Gameplay is disabled until you resume."
          primaryButtonLabel="Resume"
        />
      )}

      {settingsModal && (
        <GameSettingsModal rules={rules} uid={uid} onClose={closeSettings} />
      )}

      {winModal && (
        <ModalOverlay
          overlayAriaLabel="Game won"
          title="You won!"
          buttonAriaLabel="Close win dialog"
          onClose={() => dispatch(closeWinModal())}
          bodyText={getWinBodyText()}
          primaryButtonLabel="New Deal"
          primaryButtonAction={() => {
            dispatch(closeWinModal());
            dispatch(transitionGameAndSession({}));
          }}
          secondaryButtonLabel={isUser ? "View all stats" : "Close"}
          secondaryButtonAction={() => {
            dispatch(closeWinModal());
            if (isUser) {
              router.push("/stats");
            }
          }}
        />
      )}
    </>
  );
}
