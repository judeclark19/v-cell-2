// Settings is intentionally a UI skeleton for now.
// We’re mapping the knobs we’ll need before wiring them to persistence or the engine.

export default function SettingsPage() {
  return (
    <main>
      <header className="max-width-container">
        <h1 className="title">Settings</h1>
        <p className="subtitle">
          This page is a scaffold: the controls below are placeholders so we can
          agree on what needs to exist. We’ll wire these to session/profile +
          engine rules next.
        </p>
      </header>
      <section>
        <h2 className="h2">Gameplay</h2>
        <div className="grid">
          <label className="field">
            Face-down cards at deal
            <select className="control" disabled defaultValue="7">
              <option value="0">0 (all face-up)</option>
              <option value="7">7 (classic)</option>
              <option value="14">14</option>
              <option value="21">21</option>
            </select>
            <small className="hint">
              Engine rule: V-shape layering. Auto-flip when a face-down card
              becomes exposed.
            </small>
          </label>

          <label className="field">
            Undo limit
            <select className="control" disabled defaultValue="unlimited">
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
            <select className="control" disabled defaultValue="on">
              <option value="on">On (easier)</option>
              <option value="off">Off (harder)</option>
            </select>
            <small className="hint">
              When enabled, top foundation card can move to tableau/freecell.
            </small>
          </label>
        </div>
      </section>
    </main>
  );
}
