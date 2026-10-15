import type { Severity, Summary } from "../types";
import { cssVars } from "../utils";
import { DistBar } from "./DistBar";

interface Props {
  summary: Summary;
  severities: Severity[];
  filter: number | null;
  onFilter: (level: number) => void;
}

function subtitle({ worst, counts, rated, total }: Summary, severities: Severity[]) {
  if (worst === null) return "Pick a severity for each heuristic";
  if (worst === 0) return "No usability problems flagged";
  const n = counts[worst];
  return `Highest: ${severities[worst].name} · ${n} heuristic${n > 1 ? "s" : ""}` + (rated < total ? ` · ${total - rated} left` : "");
}

export function Overview({ summary, severities, filter, onFilter }: Props) {
  return (
    <section className="overview" aria-label="Progress and severity filter">
      <div className="progress">
        <div className="pnum"><b>{summary.rated}</b><span>/ {summary.total} rated</span></div>
        <DistBar className="dist" counts={summary.counts} />
        <p className="psub">{subtitle(summary, severities)}</p>
      </div>
      <div className={`filters${filter !== null ? " on" : ""}`} role="group" aria-label="Filter by severity">
        {severities.map(s => (
          <button key={s.level} type="button" className="chip" style={cssVars({ "--c": `var(--s${s.level})` })}
            aria-pressed={filter === s.level} title={s.description} onClick={() => onFilter(s.level)}>
            <span className="n">{s.level}</span>{s.name}<span className="k">{summary.counts[s.level]}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
