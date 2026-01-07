export default function HowToPlayPage() {
  return (
    <main className="max-width-container prose">
      <header>
        <h1>How to Play</h1>
      </header>

      <section>
        <h2>Goal</h2>
        <p>Unlock all tableau cards and collect them into the foundations.</p>
        <p className="hint">
          Foundations are cosmetic — filling them is satisfying, but not
          required for a win.
        </p>
      </section>

      <section>
        <h2>The board</h2>
        <ul>
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

        <ul>
          <li>
            <strong>Tableau → Tableau</strong>: move a valid stack or a single
            card onto a card of opposite color and one rank higher.
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
            <strong>To Foundations</strong>: move a single card to a foundation
            if it continues the suit upward (A, then 2, then 3, etc.).
          </li>
        </ul>
        <br />
        <h3>Foundation pullback (optional rule)</h3>
        <p className="hint">
          When <strong>Foundation pullback</strong> is off, you can’t pick up
          cards from foundations (you’ll see a “not allowed” cursor). When it’s
          on, you can pull the top foundation card back into the tableau or a
          free cell.
        </p>
      </section>
      {/* 
      <section>
        <h2>Locking and unlocking</h2>
        <p>
          <strong>Locked</strong> is not the same as <strong>face-down</strong>.
          Many cards can be face-up but still locked early on. As you make
          moves, more tableau cards become playable. Your win condition is
          unlocking all of them.
        </p>
      </section> */}

      {/* <section>
        <h2>Auto moves</h2>
        <p>
          Some cards can be auto-sent to foundations when it’s safe. If your
          build supports it, you may be able to double-click a card to attempt
          an automatic foundation move.
        </p>
      </section> */}

      <section>
        <h2>Keyboard controls</h2>
        <p className="hint">
          Keyboard support is designed so you can play without the mouse. Update
          the list below to match what’s currently implemented.
        </p>

        <ul>
          <li>
            <strong>Tab / Shift+Tab</strong>: move focus between interactive
            elements (playable cards, buttons).
          </li>
          <li>
            <strong>Enter / Space</strong>: activate a focused control (or pick
            up / drop a focused card, if implemented).
          </li>
          <li>
            <strong>Esc</strong>: cancel a drag / close an overlay (and resume
            from pause).
          </li>
          <li>
            <strong>U</strong>: undo (if available).
          </li>
          <li>
            <strong>P</strong>: pause / resume.
          </li>
          <li>
            <strong>R</strong>: restart deal.
          </li>
          <li>
            <strong>N</strong>: new deal.
          </li>
          <li>
            <strong>?</strong>: open this How to Play page.
          </li>
        </ul>
      </section>

      <section>
        <h2>Tips</h2>
        <ul>
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
    </main>
  );
}
