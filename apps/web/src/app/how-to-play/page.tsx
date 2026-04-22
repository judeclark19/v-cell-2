"use client";

import { useEffect } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { useSession } from "@/state/auth/AuthProvider";
import { selectUid } from "@/state/auth/authSlice";
import { useSelector } from "react-redux";
import { Panel } from "@vcell/ui";

export default function HowToPlayPage() {
  const uid = useSelector(selectUid);
  const { profileReady, needsHowToPlay } = useSession();

  useEffect(() => {
    if (!uid || !profileReady || !needsHowToPlay) return;

    void setDoc(
      doc(db, "users", uid),
      {
        needsHowToPlay: false
      },
      { merge: true }
    );
  }, [uid, profileReady, needsHowToPlay]);

  return (
    <main>
      <header>
        <h1 style={{ textAlign: "center" }}>How to Play</h1>
      </header>
      <Panel
        as="section"
        padding="lg"
        aria-label="How to play instructions"
        style={{ flex: "0 auto 2rem" }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "2rem"
          }}
        >
          <section>
            <h2>Goal</h2>
            <p>
              Unlock all tableau cards and collect them into the foundations.
            </p>
            <p className="hint">
              Foundations are cosmetic — filling them is satisfying, but not
              required for a win.
            </p>
          </section>

          <section>
            <h2>The board</h2>
            <ul style={{ paddingLeft: "1.5rem" }}>
              <li>
                <strong>Tableau</strong>: the main columns of cards. Some cards
                start locked, only the exposed cards are playable at first.
              </li>
              <li>
                <strong>Free Cells</strong>: temporary storage slots below the
                tableau (one card per slot).
              </li>
              <li>
                <strong>Foundations</strong>: suit stacks built upward (A → K),
                above the tableau.
              </li>
            </ul>
          </section>

          <section>
            <h2>Moves</h2>
            <p>
              You can drag cards (and valid stacks) around the board. A stack is
              valid when it is in descending rank and alternates color.
            </p>

            <ul style={{ paddingLeft: "1.5rem" }}>
              <li>
                <strong>Tableau → Tableau</strong>: move a valid stack or a
                single card onto a card of opposite color and one rank higher.
              </li>
              <li>
                <strong>Tableau → Free Cell</strong>: move a single card into an
                empty free cell.
              </li>
              <li>
                <strong>Free Cell → Tableau</strong>: move a single card onto a
                valid tableau target.
              </li>
              <li>
                <strong>To Foundations</strong>: move a single card to a
                foundation if it continues the suit upward (A, then 2, then 3,
                etc.).
              </li>
            </ul>
            <br />
            <h3>Foundation pullback (optional rule)</h3>
            <p className="hint">
              When <strong>Foundation pullback</strong> is off, you can’t pick
              up cards from foundations (you’ll see a “not allowed” cursor).
              When it’s on, you can pull the top foundation card back into the
              tableau or a free cell.
            </p>
          </section>

          <section>
            <h2>Keyboard controls</h2>
            <p className="hint">
              Keyboard play is fully supported. Only playable cards are
              focusable. Use the keyboard to navigate and move cards
              efficiently.
            </p>

            <ul style={{ paddingLeft: "1.5rem" }}>
              <li>
                <strong>Arrow keys (↑ ↓ ← →)</strong>: move focus spatially
                around the board (tableau, free cells, foundations).
              </li>
              <li>
                <strong>Space</strong>: toggle “carry mode” (pick up / put down
                a card). Carry mode shows a visual highlight on the carried card
                and current drop target.
              </li>
              <li>
                <strong>Enter</strong>: commit the currently focused move (drop
                carried card, or send card to foundation when applicable).
              </li>
              <li>
                <strong>F</strong>: send focused card to a foundation (if
                legal).
              </li>
              <li>
                <strong>C</strong>: send focused card to a free cell (if legal).
              </li>
              <li>
                <strong>U</strong>: undo the last move (focus returns to the
                moved card).
              </li>
              <li>
                <strong>Esc</strong>: cancel carry mode or close overlays.
              </li>
              <li>
                <strong>P</strong>: pause / resume the game.
              </li>
              <li>
                <strong>R</strong>: restart the current deal.
              </li>
              <li>
                <strong>N</strong>: start a new deal.
              </li>
            </ul>
          </section>

          <section>
            <h2>Tips</h2>
            <ul style={{ paddingLeft: "1.5rem" }}>
              <li>
                Free cells are power — but each filled free cell reduces your
                ability to move stacks.
              </li>
              <li>Prefer moves that expose and unlock more tableau cards.</li>
              <li>
                Don’t rush cards into foundations if foundation pullback is
                disabled. You might need them to build descending stacks.
              </li>
            </ul>
          </section>
        </div>
      </Panel>{" "}
    </main>
  );
}
