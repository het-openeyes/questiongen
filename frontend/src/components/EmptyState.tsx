interface Props {
  error?: string | null;
  onCreate: (sample: boolean) => void;
}

export function EmptyState({ error, onCreate }: Props) {
  if (error) {
    return (
      <div className="empty">
        <h2>Can't reach the server</h2>
        <p>Start the backend with “uvicorn app.main:app”, then reload. ({error})</p>
      </div>
    );
  }
  return (
    <div className="empty">
      <h2>No evaluations yet</h2>
      <p>Start a new heuristic evaluation, or load a filled-in sample to see how it works.</p>
      <div className="row">
        <button className="btn primary" type="button" onClick={() => onCreate(false)}>New evaluation</button>
        <button className="btn" type="button" onClick={() => onCreate(true)}>Load sample</button>
      </div>
    </div>
  );
}
