// Settings is intentionally a UI skeleton for now.
// We’re mapping the knobs we’ll need before wiring them to persistence or the engine.

export default function SettingsPage() {
  return (
    <main className="settings-page">
      <header className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">
          This page is a scaffold: the controls below are placeholders so we can
          agree on what needs to exist. We’ll wire these to session/profile +
          engine rules next.
        </p>
      </header>

      <section className="settings-section">
        <h2 className="settings-h2">Gameplay</h2>

        <div className="settings-grid">
          <label className="settings-field">
            Face-down cards at deal
            <select className="settings-control" disabled defaultValue="7">
              <option value="0">0 (all face-up)</option>
              <option value="7">7 (classic)</option>
              <option value="14">14</option>
              <option value="21">21</option>
            </select>
            <small className="settings-hint">
              Engine rule: V-shape layering. Auto-flip when a face-down card
              becomes exposed.
            </small>
          </label>

          <label className="settings-field">
            Undo limit
            <select
              className="settings-control"
              disabled
              defaultValue="unlimited"
            >
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="3">3</option>
              <option value="5">5</option>
              <option value="unlimited">Unlimited</option>
            </select>
            <small className="settings-hint">
              For MVP we can enforce in UI; later we can also record undos used
              for stats.
            </small>
          </label>

          <label className="settings-field">
            Foundation pullback
            <select className="settings-control" disabled defaultValue="on">
              <option value="on">On (easier)</option>
              <option value="off">Off (harder)</option>
            </select>
            <small className="settings-hint">
              When enabled, top foundation card can move to tableau/freecell.
            </small>
          </label>
        </div>
      </section>

      <section className="settings-section">
        <h2 className="settings-h2">Appearance</h2>

        <div className="settings-grid">
          <label className="settings-field">
            Theme
            <select className="settings-control" disabled defaultValue="poker">
              <option value="poker">Poker (default)</option>
              <option value="times-light">Times Light</option>
              <option value="times-dark">Times Dark</option>
              <option value="system">System (prefers-color-scheme)</option>
            </select>
            <small className="settings-hint">
              Implementation: set <code>data-theme</code> on the root element
              and store preference in localStorage/profile.
            </small>
          </label>

          <fieldset className="settings-fieldset" disabled>
            <legend className="settings-legend">Board &amp; UI</legend>
            <div className="settings-stack">
              <label className="settings-check">
                <input type="checkbox" defaultChecked /> Show timer
              </label>
              <label className="settings-check">
                <input type="checkbox" defaultChecked /> Sounds
              </label>
              <label className="settings-check">
                <input type="checkbox" defaultChecked /> High contrast focus
                outlines
              </label>
            </div>
          </fieldset>

          <fieldset className="settings-fieldset" disabled>
            <legend className="settings-legend">Animations</legend>
            <div className="settings-stack">
              <label className="settings-check">
                <input type="checkbox" defaultChecked /> Enable animations
              </label>
              <label className="settings-check">
                <input type="checkbox" /> Reduced motion (override)
              </label>
            </div>
            <small className="settings-hint">
              We should also respect OS <code>prefers-reduced-motion</code>.
            </small>
          </fieldset>
        </div>
      </section>

      <section className="settings-section">
        <h2 className="settings-h2">Accessibility</h2>
        <div className="settings-grid">
          <fieldset className="settings-fieldset" disabled>
            <legend className="settings-legend">Keyboard play</legend>
            <div className="settings-stack">
              <label className="settings-check">
                <input type="checkbox" defaultChecked /> Enable keyboard mode
              </label>
              <label className="settings-check">
                <input type="checkbox" defaultChecked /> Show focus ring on
                cards/piles
              </label>
            </div>
            <small className="settings-hint">
              Product requirement: fully playable by keyboard (tab/arrow/enter).
            </small>
          </fieldset>
        </div>
      </section>

      <section className="settings-section">
        <h2 className="settings-h2">Account &amp; Data</h2>
        <div className="settings-grid">
          <div className="settings-field settings-field--card">
            <strong>Session</strong>
            <div className="settings-copy">
              Guest vs logged-in status will live here. Guests can play and
              change local settings; stats/leaderboard require login.
            </div>
            <div className="settings-row">
              <button type="button" className="settings-button" disabled>
                Log in
              </button>
              <button type="button" className="settings-button" disabled>
                Log out
              </button>
            </div>
          </div>

          <fieldset className="settings-fieldset" disabled>
            <legend className="settings-legend">Import / Export</legend>
            <div className="settings-row">
              <button type="button" className="settings-button">
                Import V1 data
              </button>
              <button type="button" className="settings-button">
                Export V2 data
              </button>
            </div>
            <small className="settings-hint">
              Import: sanitize V1 export → write preferences + legacy stats.
            </small>
          </fieldset>

          <fieldset className="settings-fieldset" disabled>
            <legend className="settings-legend">Privacy</legend>
            <div className="settings-stack">
              <label className="settings-check">
                <input type="checkbox" defaultChecked /> Allow local persistence
                (settings/session)
              </label>
              <label className="settings-check">
                <input type="checkbox" defaultChecked /> Allow anonymous usage
                metrics (future)
              </label>
            </div>
          </fieldset>
        </div>
      </section>

      <footer className="settings-footer">
        Next wiring step: define a typed Settings model (local + profile), then
        connect Gameplay knobs to <code>rules</code> and Appearance knobs to
        <code>data-theme</code>.
      </footer>
    </main>
  );
}
