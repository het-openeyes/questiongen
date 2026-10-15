import { useEffect, useRef, useState, type Ref } from "react";
import type { SaveStatus } from "../hooks/useSaveQueue";
import { ChevronIcon, MenuIcon } from "./icons";

const STATUS_TEXT: Record<SaveStatus, string> = { idle: "", saving: "Saving…", saved: "All changes saved", error: "Not saved" };

interface Props {
  name: string | null;              // null = nothing open
  nameRef: Ref<HTMLInputElement>;
  status: SaveStatus;
  sideOpen: boolean;
  onToggleSide: () => void;
  onName: (value: string) => void;
  onCopy: () => void;
  onDownload: (kind: "md" | "csv") => void;
  onDuplicate: () => void;
  onReset: () => void;
  onDelete: () => void;
}

export function TopBar(p: Props) {
  const disabled = p.name === null;
  return (
    <header className="bar">
      <button className="icon-btn menu" type="button" aria-label="Show evaluations" aria-controls="side"
        aria-expanded={p.sideOpen} onClick={p.onToggleSide}>
        <MenuIcon />
      </button>
      <input ref={p.nameRef} className="name" placeholder="Untitled evaluation" aria-label="Evaluation name" autoComplete="off"
        maxLength={300} disabled={disabled} value={p.name ?? ""} onChange={e => p.onName(e.target.value)} />
      <span className={`status ${p.status}`} aria-live="polite">{STATUS_TEXT[p.status]}</span>
      <div className="bar-actions">
        <button className="btn" type="button" disabled={disabled} onClick={p.onCopy}>Copy report</button>
        <MoreMenu {...p} disabled={disabled} />
      </div>
    </header>
  );
}

function MoreMenu({ disabled, onDownload, onDuplicate, onReset, onDelete }: Props & { disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    wrap.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    const outside = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("click", outside);
    return () => document.removeEventListener("click", outside);
  }, [open]);

  const run = (fn: () => void) => () => { setOpen(false); fn(); };

  return (
    <div className="menu-wrap" ref={wrap} onKeyDown={e => {
      if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false); trigger.current?.focus(); }
    }}>
      <button ref={trigger} className="btn" type="button" aria-haspopup="menu" aria-expanded={open} disabled={disabled}
        onClick={() => setOpen(o => !o)}>
        More<ChevronIcon />
      </button>
      {open && (
        <div className="pop" role="menu">
          <button role="menuitem" type="button" onClick={run(() => onDownload("md"))}>Download Markdown</button>
          <button role="menuitem" type="button" onClick={run(() => onDownload("csv"))}>Download CSV</button>
          <button role="menuitem" type="button" onClick={run(onDuplicate)}>Duplicate</button>
          <hr />
          <button role="menuitem" type="button" onClick={run(onReset)}>Clear ratings &amp; notes</button>
          <button role="menuitem" type="button" className="danger" onClick={run(onDelete)}>Delete evaluation</button>
        </div>
      )}
    </div>
  );
}
