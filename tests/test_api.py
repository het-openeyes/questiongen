import importlib

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("HES_DB_PATH", str(tmp_path / "test.db"))
    from app import db, main
    importlib.reload(db)
    importlib.reload(main)
    with TestClient(main.app) as c:
        yield c


def test_reference(client):
    r = client.get("/api/reference").json()
    assert len(r["heuristics"]) == 10
    assert [s["level"] for s in r["severities"]] == [0, 1, 2, 3, 4]


def test_create_update_and_summary(client):
    ev = client.post("/api/evaluations", json={"name": "Checkout"}).json()
    assert ev["name"] == "Checkout"
    assert len(ev["items"]) == 10
    assert ev["summary"] == {"rated": 0, "total": 10, "counts": [0, 0, 0, 0, 0], "worst": None}

    eid = ev["id"]
    assert client.patch(f"/api/evaluations/{eid}/items/4", json={"severity": 4, "issues": "Bad"}).status_code == 200
    assert client.patch(f"/api/evaluations/{eid}/items/0", json={"severity": 1}).status_code == 200
    # Partial update leaves severity alone
    client.patch(f"/api/evaluations/{eid}/items/4", json={"recommendation": "Fix"})

    ev = client.get(f"/api/evaluations/{eid}").json()
    assert ev["items"][4] == {"heuristic": 4, "severity": 4, "issues": "Bad", "recommendation": "Fix"}
    assert ev["summary"]["counts"] == [0, 1, 0, 0, 1]
    assert ev["summary"]["worst"] == 4

    # Explicit null clears the rating
    client.patch(f"/api/evaluations/{eid}/items/4", json={"severity": None})
    assert client.get(f"/api/evaluations/{eid}").json()["items"][4]["severity"] is None


def test_validation(client):
    eid = client.post("/api/evaluations").json()["id"]
    assert client.patch(f"/api/evaluations/{eid}/items/0", json={"severity": 5}).status_code == 422
    assert client.patch(f"/api/evaluations/{eid}/items/10", json={"severity": 1}).status_code == 404
    assert client.patch(f"/api/evaluations/{eid}", json={"date": "yesterday"}).status_code == 422
    assert client.patch(f"/api/evaluations/{eid}", json={"bogus": 1}).status_code == 422
    assert client.get("/api/evaluations/999").status_code == 404


def test_meta_list_and_delete(client):
    a = client.post("/api/evaluations", json={"name": "A"}).json()
    b = client.post("/api/evaluations", json={"name": "B"}).json()
    client.patch(f"/api/evaluations/{a['id']}", json={"evaluator": "Sam", "site": "shop.test"})
    names = [e["name"] for e in client.get("/api/evaluations").json()]
    assert names[0] == "A"  # most recently updated first
    assert client.delete(f"/api/evaluations/{b['id']}").status_code == 204
    assert [e["id"] for e in client.get("/api/evaluations").json()] == [a["id"]]


def test_sample_reset_duplicate_and_exports(client):
    ev = client.post("/api/evaluations", json={"sample": True}).json()
    assert ev["summary"]["rated"] == 8

    dup = client.post(f"/api/evaluations/{ev['id']}/duplicate").json()
    assert dup["name"].endswith("(copy)")
    assert dup["items"] == ev["items"]

    md = client.get(f"/api/evaluations/{ev['id']}/export.md").text
    assert md.startswith("# Heuristic evaluation:")
    # Most severe heuristic (Error prevention, sev 4) is listed first
    assert md.index("## 5. Error prevention") < md.index("## 1. Visibility")

    csv = client.get(f"/api/evaluations/{ev['id']}/export.csv")
    assert "attachment" in csv.headers["content-disposition"]
    assert "Error prevention" in csv.text

    reset = client.post(f"/api/evaluations/{ev['id']}/reset").json()
    assert reset["summary"]["rated"] == 0
    assert reset["name"] == ev["name"]
    # Duplicate unaffected
    assert client.get(f"/api/evaluations/{dup['id']}").json()["summary"]["rated"] == 8


def test_frontend_served(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "Heuristic Review" in r.text
