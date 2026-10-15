import type { ListEntry } from "../types";
import { fmtDate } from "../utils";
import { DistBar } from "./DistBar";
import { CheckIcon, PlusIcon } from "./icons";

interface Props {
  list: ListEntry[];
  currentId: number | null;
  open: boolean;
  onClose: () => void;
  onCreate: (sample: boolean) => void;
}

export function Sidebar({ list, currentId, open, onClose, onCreate }: Props) {
  return (
    <>
      <aside className={`side${open ? " open" : ""}`} id="side" aria-label="Evaluations">
        <div className="brand">
          <span className="logo"><CheckIcon /></span>
          <div>
            <strong>Heuristic Review</strong>
            <small>Nielsen's 10 usability heuristics</small>
          </div>
        </div>
        <div className="side-actions">
          <button className="btn primary block" type="button" onClick={() => onCreate(false)}>
            <PlusIcon />New evaluation
          </button>
          <button className="btn ghost block" type="button" onClick={() => onCreate(true)}>Load sample</button>
        </div>
        <p className="side-label">Saved evaluations{list.length ? ` · ${list.length}` : ""}</p>
        <nav className="ev-list">
          {list.map(e => (
            <a key={e.id} className="ev" href={`#/e/${e.id}`} aria-current={e.id === currentId ? "page" : undefined} onClick={onClose}>
              <b>{e.name || "Untitled evaluation"}</b>
              <small>
                <span>{e.site || fmtDate(e.date)}</span>
                <span>{e.summary.rated}/{e.summary.total}</span>
              </small>
              <DistBar className="mini" counts={e.summary.counts} />
            </a>
          ))}
        </nav>
      </aside>
      <div className="scrim" onClick={onClose} />
    </>
  );
}
