"""SQLite persistence. One row per evaluation, one row per (evaluation, heuristic) item."""

import os
import sqlite3
from contextlib import contextmanager
from datetime import date, datetime, timezone
from pathlib import Path

from .heuristics import HEURISTIC_COUNT, SAMPLE_ITEMS, SAMPLE_META

DB_PATH = Path(os.environ.get("HES_DB_PATH", Path(__file__).resolve().parent.parent / "data" / "evaluations.db"))

META_FIELDS = ("name", "evaluator", "date", "site", "device", "browser", "task")

SCHEMA = """
CREATE TABLE IF NOT EXISTS evaluations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL DEFAULT '',
    evaluator   TEXT NOT NULL DEFAULT '',
    date        TEXT NOT NULL DEFAULT '',
    site        TEXT NOT NULL DEFAULT '',
    device      TEXT NOT NULL DEFAULT '',
    browser     TEXT NOT NULL DEFAULT '',
    task        TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS items (
    evaluation_id  INTEGER NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    heuristic      INTEGER NOT NULL,
    severity       INTEGER CHECK (severity IS NULL OR severity BETWEEN 0 AND 4),
    issues         TEXT NOT NULL DEFAULT '',
    recommendation TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (evaluation_id, heuristic)
);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="microseconds")


@contextmanager
def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as conn:
        conn.executescript(SCHEMA)


def _touch(conn, evaluation_id: int) -> None:
    conn.execute("UPDATE evaluations SET updated_at = ? WHERE id = ?", (_now(), evaluation_id))


def _row_to_evaluation(conn, row) -> dict:
    items = conn.execute(
        "SELECT heuristic, severity, issues, recommendation FROM items WHERE evaluation_id = ? ORDER BY heuristic",
        (row["id"],),
    ).fetchall()
    return {
        "id": row["id"],
        **{f: row[f] for f in META_FIELDS},
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "items": [dict(i) for i in items],
    }


def list_evaluations() -> list[dict]:
    with connect() as conn:
        rows = conn.execute("SELECT * FROM evaluations ORDER BY updated_at DESC, id DESC").fetchall()
        return [_row_to_evaluation(conn, r) for r in rows]


def get_evaluation(evaluation_id: int) -> dict | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM evaluations WHERE id = ?", (evaluation_id,)).fetchone()
        return _row_to_evaluation(conn, row) if row else None


def create_evaluation(meta: dict, sample: bool = False) -> dict:
    values = {f: "" for f in META_FIELDS}
    values["date"] = date.today().isoformat()
    if sample:
        values.update(SAMPLE_META)
    values.update({k: v for k, v in meta.items() if v is not None})
    if not values["name"]:
        values["name"] = "Untitled evaluation"

    now = _now()
    with connect() as conn:
        cur = conn.execute(
            f"INSERT INTO evaluations ({', '.join(META_FIELDS)}, created_at, updated_at) "
            f"VALUES ({', '.join('?' * len(META_FIELDS))}, ?, ?)",
            (*(values[f] for f in META_FIELDS), now, now),
        )
        eid = cur.lastrowid
        rows = SAMPLE_ITEMS if sample else [(None, "", "")] * HEURISTIC_COUNT
        conn.executemany(
            "INSERT INTO items (evaluation_id, heuristic, severity, issues, recommendation) VALUES (?, ?, ?, ?, ?)",
            [(eid, i, sev, iss, rec) for i, (sev, iss, rec) in enumerate(rows)],
        )
    return get_evaluation(eid)


def update_meta(evaluation_id: int, changes: dict) -> dict | None:
    changes = {k: v for k, v in changes.items() if k in META_FIELDS}
    with connect() as conn:
        if not conn.execute("SELECT 1 FROM evaluations WHERE id = ?", (evaluation_id,)).fetchone():
            return None
        if changes:
            sets = ", ".join(f"{k} = ?" for k in changes)
            conn.execute(f"UPDATE evaluations SET {sets} WHERE id = ?", (*changes.values(), evaluation_id))
        _touch(conn, evaluation_id)
    return get_evaluation(evaluation_id)


def update_item(evaluation_id: int, heuristic: int, changes: dict) -> dict | None:
    """Apply a partial update. `changes` may contain severity (None clears it), issues, recommendation."""
    allowed = {k: v for k, v in changes.items() if k in ("severity", "issues", "recommendation")}
    with connect() as conn:
        exists = conn.execute(
            "SELECT 1 FROM items WHERE evaluation_id = ? AND heuristic = ?", (evaluation_id, heuristic)
        ).fetchone()
        if not exists:
            return None
        if allowed:
            sets = ", ".join(f"{k} = ?" for k in allowed)
            conn.execute(
                f"UPDATE items SET {sets} WHERE evaluation_id = ? AND heuristic = ?",
                (*allowed.values(), evaluation_id, heuristic),
            )
        _touch(conn, evaluation_id)
        row = conn.execute(
            "SELECT heuristic, severity, issues, recommendation FROM items WHERE evaluation_id = ? AND heuristic = ?",
            (evaluation_id, heuristic),
        ).fetchone()
        return dict(row)


def reset_evaluation(evaluation_id: int) -> dict | None:
    with connect() as conn:
        if not conn.execute("SELECT 1 FROM evaluations WHERE id = ?", (evaluation_id,)).fetchone():
            return None
        conn.execute(
            "UPDATE items SET severity = NULL, issues = '', recommendation = '' WHERE evaluation_id = ?",
            (evaluation_id,),
        )
        _touch(conn, evaluation_id)
    return get_evaluation(evaluation_id)


def duplicate_evaluation(evaluation_id: int) -> dict | None:
    src = get_evaluation(evaluation_id)
    if not src:
        return None
    copy = create_evaluation({f: src[f] for f in META_FIELDS} | {"name": f"{src['name']} (copy)"})
    with connect() as conn:
        conn.executemany(
            "UPDATE items SET severity = ?, issues = ?, recommendation = ? WHERE evaluation_id = ? AND heuristic = ?",
            [(i["severity"], i["issues"], i["recommendation"], copy["id"], i["heuristic"]) for i in src["items"]],
        )
    return get_evaluation(copy["id"])


def delete_evaluation(evaluation_id: int) -> bool:
    with connect() as conn:
        return conn.execute("DELETE FROM evaluations WHERE id = ?", (evaluation_id,)).rowcount > 0
