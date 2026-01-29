type BoardControlsProps = {
  seed: string;
  onNewDeal: () => void;
  onRestart: () => void;
  onUndo: () => void;
  canUndo: boolean;
  undoLimit: "unlimited" | number;
  undosRemaining: number;
};

export default function BoardControls({
  seed,
  onNewDeal,
  onRestart,
  onUndo,
  canUndo,
  undoLimit,
  undosRemaining
}: BoardControlsProps) {
  return (
    <section className="control" aria-label="Game actions">
      <div className="row">
        <button type="button" className="btn btn--primary" onClick={onNewDeal}>
          New deal
        </button>

        <button
          type="button"
          className="btn btn--secondary"
          onClick={onRestart}
        >
          Restart deal
        </button>

        <button
          type="button"
          className="btn btn--secondary"
          onClick={onUndo}
          disabled={!canUndo}
        >
          {undoLimit === "unlimited" || undoLimit === 0
            ? "Undo"
            : `Undo (${undosRemaining})`}
        </button>
      </div>

      <p className="hint" style={{ textAlign: "center" }}>
        Seed: {seed || "(unknown)"}
      </p>
    </section>
  );
}
