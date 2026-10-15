import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { api, errorMessage, evalPath, exportUrl, itemPath } from "./api";
import { EmptyState } from "./components/EmptyState";
import { HeuristicCard } from "./components/HeuristicCard";
import { MetaForm } from "./components/MetaForm";
import { Overview } from "./components/Overview";
import { Sidebar } from "./components/Sidebar";
import { Toast } from "./components/Toast";
import { TopBar } from "./components/TopBar";
import { useLatest } from "./hooks/useLatest";
import { useSaveQueue } from "./hooks/useSaveQueue";
import { useToast } from "./hooks/useToast";
import { initialState, reducer } from "./state";
import type { Evaluation, MetaField, NoteField, Reference } from "./types";
import { copyText, prefersReducedMotion, summarize } from "./utils";

const parseHash = () => {
  const m = location.hash.match(/^#\/e\/(\d+)$/);
  return m ? Number(m[1]) : null;
};

function navigate(id: number | null) {
  if (id !== null) location.hash = `#/e/${id}`;
  else {
    history.replaceState(null, "", location.pathname + location.search);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
}

export default function App() {
  const [reference, setReference] = useState<Reference | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [{ list, ev }, dispatch] = useReducer(reducer, initialState);
  const [filter, setFilter] = useState<number | null>(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [hashId, setHashId] = useState(parseHash);

  const { toast, show } = useToast();
  const saver = useSaveQueue(msg => show(msg, true));
  const { queue, flush, drop } = saver;

  const latest = useLatest({ list, ev, filter });
  const activeCard = useRef<number | null>(null);
  const cardEls = useRef<(HTMLElement | null)[]>([]);
  const nameRef = useRef<HTMLInputElement>(null);

  /* ---------- Boot ---------- */
  useEffect(() => {
    let cancelled = false;
    Promise.all([api.reference(), api.list()])
      .then(([ref, l]) => {
        if (cancelled) return;
        dispatch({ type: "listLoaded", list: l });
        setReference(ref);
      })
      .catch(e => !cancelled && setBootError(errorMessage(e)));
    return () => { cancelled = true; };
  }, []);

  /* ---------- Hash routing: #/e/<id> ---------- */
  useEffect(() => {
    const onHash = () => setHashId(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!reference) return;
    setSideOpen(false);
    const { list, ev } = latest.current;
    if (hashId === null) {
      if (list.length) location.replace(`#/e/${list[0].id}`);
      else dispatch({ type: "closed" });
      return;
    }
    if (ev?.id === hashId) return;   // already showing it (just created / duplicated)

    let cancelled = false;
    (async () => {
      await flush();
      try {
        const loaded = await api.get(hashId);
        if (cancelled) return;
        dispatch({ type: "opened", ev: loaded });
        setFilter(null);
        window.scrollTo(0, 0);
      } catch (e) {
        if (cancelled) return;
        show(`Couldn't open evaluation: ${errorMessage(e)}`, true);
        const fallback = latest.current.list.find(x => x.id !== hashId);
        if (fallback) location.replace(`#/e/${fallback.id}`);
        else dispatch({ type: "closed" });
      }
    })();
    return () => { cancelled = true; };
  }, [hashId, reference, flush, show, latest]);

  const title = ev ? `${ev.name || "Untitled"} · Heuristic Review` : "Heuristic Review";
  useEffect(() => { document.title = title; }, [title]);

  /* ---------- Editing ---------- */
  const setSeverity = useCallback((i: number, level: number, toggle: boolean) => {
    const cur = latest.current.ev;
    if (!cur) return;
    const severity = toggle && cur.items[i].severity === level ? null : level;
    dispatch({ type: "item", index: i, patch: { severity } });
    queue(`item:${cur.id}:${i}`, itemPath(cur.id, i), { severity }, 0);
  }, [latest, queue]);

  const setNote = useCallback((i: number, field: NoteField, value: string) => {
    const cur = latest.current.ev;
    if (!cur) return;
    dispatch({ type: "item", index: i, patch: { [field]: value } });
    queue(`item:${cur.id}:${i}`, itemPath(cur.id, i), { [field]: value });
  }, [latest, queue]);

  const setMeta = useCallback((field: MetaField, value: string) => {
    const cur = latest.current.ev;
    if (!cur) return;
    dispatch({ type: "meta", field, value });
    if (field === "date" && value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    queue(`meta:${cur.id}`, evalPath(cur.id), { [field]: value });
  }, [latest, queue]);

  const setActive = useCallback((i: number) => { activeCard.current = i; }, []);
  const registerEl = useCallback((i: number, el: HTMLElement | null) => { cardEls.current[i] = el; }, []);

  /* ---------- Filter ---------- */
  const toggleFilter = useCallback((level: number | null) => {
    const { ev, filter } = latest.current;
    const next = level === null || filter === level ? null : level;
    setFilter(next);
    if (next === null || !ev || !reference) return;
    const matches = ev.items.filter(it => it.severity === next).length;
    const name = reference.severities[next].name;
    show(matches ? `Showing ${matches} rated “${name}”` : `Nothing rated “${name}” yet`);
    const first = ev.items.findIndex(it => it.severity === next);
    cardEls.current[first]?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
  }, [latest, reference, show]);

  /* ---------- Actions ---------- */
  const showCreated = (created: Evaluation) => {
    dispatch({ type: "replaced", ev: created });
    setFilter(null);
    navigate(created.id);
    window.scrollTo(0, 0);
  };

  const create = async (sample: boolean) => {
    try {
      await flush();
      showCreated(await api.create(sample));
      if (sample) show("Sample loaded");
      else setTimeout(() => { nameRef.current?.focus(); nameRef.current?.select(); }, 60);
    } catch (e) { show(`Couldn't create evaluation: ${errorMessage(e)}`, true); }
  };

  const copyReport = async () => {
    if (!ev) return;
    try {
      await flush();
      const md = await api.markdown(ev.id);
      show(await copyText(md) ? "Report copied as Markdown" : "Copy is blocked here — use Download Markdown");
    } catch (e) { show(`Couldn't build report: ${errorMessage(e)}`, true); }
  };

  const download = async (kind: "md" | "csv") => {
    if (!ev) return;
    await flush();
    location.href = exportUrl(ev.id, kind);
  };

  const duplicate = async () => {
    if (!ev) return;
    try {
      await flush();
      showCreated(await api.duplicate(ev.id));
      show("Duplicated");
    } catch (e) { show(`Couldn't duplicate: ${errorMessage(e)}`, true); }
  };

  const reset = async () => {
    if (!ev || !confirm(`Clear all ratings and notes in “${ev.name}”? Session details are kept.`)) return;
    try {
      await flush();
      dispatch({ type: "replaced", ev: await api.reset(ev.id) });
      setFilter(null);
      show("Ratings and notes cleared");
    } catch (e) { show(`Couldn't clear: ${errorMessage(e)}`, true); }
  };

  const remove = async () => {
    if (!ev || !confirm(`Delete “${ev.name}”? This can't be undone.`)) return;
    const id = ev.id;
    try {
      drop(evalPath(id));   // unsent edits would 404 anyway
      await flush();
      await api.remove(id);
      const next = list.find(e => e.id !== id);
      dispatch({ type: "removed", id });
      show("Evaluation deleted");
      navigate(next ? next.id : null);
    } catch (e) { show(`Couldn't delete: ${errorMessage(e)}`, true); }
  };

  /* ---------- Keyboard: 0–4 rates the hovered card, Esc closes / clears ---------- */
  const onKey = useLatest((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      if (sideOpen) setSideOpen(false);
      else if (filter !== null) toggleFilter(null);
      return;
    }
    const t = e.target as HTMLElement;
    if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    if (ev && /^[0-4]$/.test(e.key) && activeCard.current !== null && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      setSeverity(activeCard.current, Number(e.key), true);
    }
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => onKey.current(e);
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onKey]);

  /* ---------- Render ---------- */
  const levels = reference?.severities.length ?? 5;
  const summary = useMemo(() => (ev ? summarize(ev.items, levels) : null), [ev, levels]);
  const ready = reference !== null;

  return (
    <div className="shell">
      <Sidebar list={list} currentId={ev?.id ?? null} open={sideOpen} onClose={() => setSideOpen(false)} onCreate={create} />
      <main className="main">
        <TopBar name={ev ? ev.name : null} nameRef={nameRef} status={saver.status} sideOpen={sideOpen}
          onToggleSide={() => setSideOpen(o => !o)} onName={v => setMeta("name", v)} onCopy={copyReport}
          onDownload={download} onDuplicate={duplicate} onReset={reset} onDelete={remove} />

        {bootError && <EmptyState error={bootError} onCreate={create} />}
        {ready && !ev && !list.length && <EmptyState onCreate={create} />}

        {ready && ev && summary && (
          <div className="content">
            <MetaForm ev={ev} onChange={setMeta} />
            <Overview summary={summary} severities={reference.severities} filter={filter} onFilter={toggleFilter} />
            <p className="hint">
              <span>Hover a heuristic and press <kbd>0</kbd>–<kbd>4</kbd> to rate it</span>
              <span>Press the same number again to clear</span>
              <span><kbd>Esc</kbd> clears the filter</span>
            </p>
            <div className={`cards${filter !== null ? " filtering" : ""}`}>
              {reference.heuristics.map((h, i) => (
                <HeuristicCard key={i} index={i} heuristic={h} item={ev.items[i]} severities={reference.severities}
                  dim={filter !== null && ev.items[i].severity !== filter}
                  onSeverity={setSeverity} onNote={setNote} onActive={setActive} registerEl={registerEl} />
              ))}
            </div>
            <p className="credit">Original sheet design by Hsin-Jou Lin</p>
          </div>
        )}
      </main>
      <Toast toast={toast} />
    </div>
  );
}
