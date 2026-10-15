"""Summary statistics and export formats (Markdown, CSV)."""

import csv
import io

from .heuristics import HEURISTICS, SEVERITIES


def summarize(items: list[dict]) -> dict:
    rated = [i["severity"] for i in items if i["severity"] is not None]
    counts = [rated.count(s["level"]) for s in SEVERITIES]
    return {"rated": len(rated), "total": len(HEURISTICS), "counts": counts, "worst": max(rated) if rated else None}


def _sev_label(sev: int | None) -> str:
    return "Not rated" if sev is None else f"{sev} – {SEVERITIES[sev]['name']}"


def to_markdown(ev: dict) -> str:
    s = summarize(ev["items"])
    lines = [f"# Heuristic evaluation: {ev['name']}", ""]
    for label, key in [("Evaluator", "evaluator"), ("Date", "date"), ("Website/App", "site"),
                       ("Device", "device"), ("Browser/OS", "browser"), ("Task/Feature", "task")]:
        lines.append(f"- **{label}:** {ev[key] or '—'}")
    lines += ["", f"**Rated:** {s['rated']} of {s['total']}  ",
              "**Distribution:** " + ", ".join(f"{sv['name']} {c}" for sv, c in zip(SEVERITIES, s["counts"])), ""]

    # Most severe first, so the report reads as a prioritised fix list.
    order = sorted(ev["items"], key=lambda i: (-(i["severity"] if i["severity"] is not None else -1), i["heuristic"]))
    for it in order:
        h = HEURISTICS[it["heuristic"]]
        lines += [f"## {it['heuristic'] + 1}. {h['title']}",
                  f"**Severity:** {_sev_label(it['severity'])}", "",
                  f"**Issues:** {it['issues'] or '—'}", "",
                  f"**Recommendation:** {it['recommendation'] or '—'}", ""]
    return "\n".join(lines)


def to_csv(ev: dict) -> str:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["#", "Heuristic", "Severity", "Severity name", "Issues", "Recommendation"])
    for it in ev["items"]:
        sev = it["severity"]
        w.writerow([it["heuristic"] + 1, HEURISTICS[it["heuristic"]]["title"],
                    "" if sev is None else sev, "" if sev is None else SEVERITIES[sev]["name"],
                    it["issues"], it["recommendation"]])
    return buf.getvalue()
