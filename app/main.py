"""FastAPI app: JSON API under /api, static frontend at /."""

import re
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from . import db
from .heuristics import HEURISTIC_COUNT, HEURISTICS, SEVERITIES
from .report import summarize, to_csv, to_markdown
from .schemas import CreateIn, Evaluation, EvaluationListItem, Item, ItemIn, MetaIn

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(_: FastAPI):
    db.init_db()
    yield


app = FastAPI(title="Heuristic Evaluation API", version="1.0.0", lifespan=lifespan)


def _with_summary(ev: dict) -> dict:
    return {**ev, "summary": summarize(ev["items"])}


def _get_or_404(evaluation_id: int) -> dict:
    ev = db.get_evaluation(evaluation_id)
    if not ev:
        raise HTTPException(404, "Evaluation not found")
    return ev


def _filename(ev: dict, ext: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", ev["name"].lower()).strip("-") or "evaluation"
    return f"{slug}.{ext}"


@app.get("/api/reference")
def reference():
    """Heuristic and severity definitions, so the frontend has a single source of truth."""
    return {"heuristics": HEURISTICS, "severities": SEVERITIES}


@app.get("/api/evaluations", response_model=list[EvaluationListItem])
def list_evaluations():
    return [_with_summary(ev) for ev in db.list_evaluations()]


@app.post("/api/evaluations", response_model=Evaluation, status_code=201)
def create_evaluation(body: CreateIn | None = None):
    body = body or CreateIn()
    meta = body.model_dump(exclude={"sample"}, exclude_none=True)
    return _with_summary(db.create_evaluation(meta, sample=body.sample))


@app.get("/api/evaluations/{evaluation_id}", response_model=Evaluation)
def get_evaluation(evaluation_id: int):
    return _with_summary(_get_or_404(evaluation_id))


@app.patch("/api/evaluations/{evaluation_id}", response_model=Evaluation)
def update_meta(evaluation_id: int, body: MetaIn):
    ev = db.update_meta(evaluation_id, body.model_dump(exclude_unset=True))
    if not ev:
        raise HTTPException(404, "Evaluation not found")
    return _with_summary(ev)


@app.delete("/api/evaluations/{evaluation_id}", status_code=204)
def delete_evaluation(evaluation_id: int):
    if not db.delete_evaluation(evaluation_id):
        raise HTTPException(404, "Evaluation not found")
    return Response(status_code=204)


@app.post("/api/evaluations/{evaluation_id}/reset", response_model=Evaluation)
def reset_evaluation(evaluation_id: int):
    ev = db.reset_evaluation(evaluation_id)
    if not ev:
        raise HTTPException(404, "Evaluation not found")
    return _with_summary(ev)


@app.post("/api/evaluations/{evaluation_id}/duplicate", response_model=Evaluation, status_code=201)
def duplicate_evaluation(evaluation_id: int):
    ev = db.duplicate_evaluation(evaluation_id)
    if not ev:
        raise HTTPException(404, "Evaluation not found")
    return _with_summary(ev)


@app.patch("/api/evaluations/{evaluation_id}/items/{heuristic}", response_model=Item)
def update_item(evaluation_id: int, heuristic: int, body: ItemIn):
    if not 0 <= heuristic < HEURISTIC_COUNT:
        raise HTTPException(404, "Heuristic not found")
    item = db.update_item(evaluation_id, heuristic, body.model_dump(exclude_unset=True))
    if not item:
        raise HTTPException(404, "Evaluation not found")
    return item


@app.get("/api/evaluations/{evaluation_id}/export.md")
def export_markdown(evaluation_id: int, download: bool = False):
    ev = _get_or_404(evaluation_id)
    headers = {"Content-Disposition": f'attachment; filename="{_filename(ev, "md")}"'} if download else None
    return Response(to_markdown(ev), media_type="text/markdown; charset=utf-8", headers=headers)


@app.get("/api/evaluations/{evaluation_id}/export.csv")
def export_csv(evaluation_id: int):
    ev = _get_or_404(evaluation_id)
    # BOM so Excel opens UTF-8 correctly.
    return Response("﻿" + to_csv(ev), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{_filename(ev, "csv")}"'})


if (FRONTEND_DIST / "index.html").exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
else:
    @app.get("/", include_in_schema=False)
    def frontend_not_built():
        return HTMLResponse(
            "<!doctype html><title>Heuristic Review</title><body style='font-family:system-ui;padding:40px'>"
            "<h1>Heuristic Review</h1><p>The React frontend hasn't been built yet.</p>"
            "<p>Run <code>npm install &amp;&amp; npm run build</code> in <code>frontend/</code> and restart, "
            "or use <code>npm run dev</code> and open <a href='http://localhost:5173'>localhost:5173</a>.</p>"
            "<p>API docs: <a href='/docs'>/docs</a></p></body>"
        )
