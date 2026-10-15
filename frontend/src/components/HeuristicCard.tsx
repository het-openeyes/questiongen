import { memo, useRef, type KeyboardEvent } from "react";
import type { Heuristic, Item, NoteField, Severity } from "../types";
import { cssVars, wordCount } from "../utils";
import { AutoTextarea } from "./AutoTextarea";

interface Props {
  index: number;
  heuristic: Heuristic;
  item: Item;
  severities: Severity[];
  dim: boolean;
  onSeverity: (index: number, level: number, toggle: boolean) => void;
  onNote: (index: number, field: NoteField, value: string) => void;
  onActive: (index: number) => void;
  registerEl: (index: number, el: HTMLElement | null) => void;
}

const NOTES: { field: NoteField; label: string; placeholder: string }[] = [
  { field: "issues", label: "Issues", placeholder: "What did you observe? Be specific: where, what happened, who was affected." },
  { field: "recommendation", label: "Recommendation", placeholder: "Suggest a fix…" },
];

export const HeuristicCard = memo(function HeuristicCard(p: Props) {
  const { index: i, item, severities } = p;
  const sev = item.severity;
  const style = sev === null ? undefined : cssVars({ "--c": `var(--s${sev})` });

  return (
    <article ref={el => p.registerEl(i, el)} className={`card${p.dim ? " dim" : ""}`} data-sev={sev ?? undefined} style={style}
      aria-labelledby={`h-${i}`} onMouseEnter={() => p.onActive(i)} onFocus={() => p.onActive(i)}>
      <div className="hcol">
        <div className="htitle">
          <span className="hnum">{String(i + 1).padStart(2, "0")}</span>
          <h2 id={`h-${i}`}>{p.heuristic.title}</h2>
        </div>
        <p className="hdesc">{p.heuristic.description}</p>
        <div className="sevrow">
          <div className="sevlab">
            <span id={`sl-${i}`}>Severity</span>
            <b>{sev === null ? "Not rated" : severities[sev].name}</b>
          </div>
          <SeverityPicker labelledBy={`h-${i} sl-${i}`} value={sev} severities={severities}
            onChange={(level, toggle) => p.onSeverity(i, level, toggle)} />
        </div>
      </div>
      {NOTES.map(n => {
        const words = wordCount(item[n.field]);
        return (
          <label key={n.field} className="ncol">
            <span className="nh">
              <span className="nt">{n.label}</span>
              <span className="wc">{words ? `${words} word${words > 1 ? "s" : ""}` : ""}</span>
            </span>
            <AutoTextarea maxLength={10000} placeholder={n.placeholder} value={item[n.field]}
              onChange={e => p.onNote(i, n.field, e.target.value)} />
          </label>
        );
      })}
    </article>
  );
});

interface PickerProps {
  labelledBy: string;
  value: number | null;
  severities: Severity[];
  onChange: (level: number, toggle: boolean) => void;
}

/** Radio group: click the selected level again to clear it; arrow keys move and select. */
function SeverityPicker({ labelledBy, value, severities, onChange }: PickerProps) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const count = severities.length;

  const onKeyDown = (e: KeyboardEvent) => {
    const dir = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[e.key];
    if (!dir) return;
    e.preventDefault();
    const next = value === null ? (dir > 0 ? 0 : count - 1) : (value + dir + count) % count;
    onChange(next, false);
    buttons.current[next]?.focus();
  };

  return (
    <div className="seg" role="radiogroup" aria-labelledby={labelledBy} onKeyDown={onKeyDown}>
      {severities.map(s => {
        const checked = value === s.level;
        return (
          <button key={s.level} ref={el => { buttons.current[s.level] = el; }} type="button" role="radio"
            aria-checked={checked} tabIndex={checked || (value === null && s.level === 0) ? 0 : -1}
            style={cssVars({ "--oc": `var(--s${s.level})` })} title={`${s.level} – ${s.name}: ${s.description}`}
            aria-label={`${s.level}: ${s.name}`} onClick={() => onChange(s.level, true)}>
            {s.level}
          </button>
        );
      })}
    </div>
  );
}
