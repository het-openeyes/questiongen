# Heuristic Review

A web app for running heuristic evaluations against Nielsen's 10 usability heuristics. For each heuristic, you give a 0–4 severity rating and write down the issues you found and a recommended fix. Evaluations are stored in SQLite, and you can export each one as Markdown or CSV.

The backend is FastAPI with SQLite. The frontend is React 19 and TypeScript, built with Vite.

## Run

You need Python 3.11+ and Node 20+.

**Development** (two terminals; the React app hot-reloads):

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload          # API on :8000
```

```bash
cd frontend
npm install
npm run dev                            # UI on http://localhost:5173 (sends /api requests on to :8000)
```

**Production** (one server):

```bash
cd frontend && npm install && npm run build && cd ..
uvicorn app.main:app                   # serves the build and the API at http://127.0.0.1:8000
```

Interactive API docs are at http://127.0.0.1:8000/docs.

By default the database is `data/evaluations.db`. Set `HES_DB_PATH` to store it somewhere else.

## Test

```bash
pytest                                 # API tests
cd frontend && npm run typecheck       # TypeScript
```

## Layout

```
app/
  main.py           FastAPI routes; serves frontend/dist at /
  db.py             SQLite schema and queries
  schemas.py        Pydantic request/response models
  heuristics.py     Heuristic and severity definitions, sample data
  report.py         Summary stats, Markdown and CSV export
frontend/src/
  App.tsx           Routing (#/e/<id>), actions, keyboard shortcuts
  state.ts          Reducer for the evaluation list and the open evaluation
  api.ts            Typed API client
  hooks/            useSaveQueue (debounced, ordered auto-save), useToast, useLatest
  components/       Sidebar, TopBar, MetaForm, Overview, HeuristicCard, …
  styles.css
tests/test_api.py
```

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/reference` | Heuristic and severity definitions |
| GET | `/api/evaluations` | List evaluations with summaries, most recently updated first |
| POST | `/api/evaluations` | Create one. Body: optional meta fields, `"sample": true` for demo data |
| GET | `/api/evaluations/{id}` | Full evaluation with items and summary |
| PATCH | `/api/evaluations/{id}` | Update meta: `name`, `evaluator`, `date`, `site`, `device`, `browser`, `task` |
| PATCH | `/api/evaluations/{id}/items/{0-9}` | Partial update of `severity` (`null` clears it), `issues`, `recommendation` |
| POST | `/api/evaluations/{id}/reset` | Clear all ratings and notes, keep meta |
| POST | `/api/evaluations/{id}/duplicate` | Copy an evaluation |
| DELETE | `/api/evaluations/{id}` | Delete |
| GET | `/api/evaluations/{id}/export.md` | Markdown report, most severe first (`?download=1` to download it as a file) |
| GET | `/api/evaluations/{id}/export.csv` | CSV, one row per heuristic |
