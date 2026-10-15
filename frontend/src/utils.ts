import type { CSSProperties } from "react";
import type { Evaluation, Item, ListEntry, Summary } from "./types";

export function summarize(items: Item[], levels: number): Summary {
  const rated = items.flatMap(i => (i.severity === null ? [] : [i.severity]));
  return {
    rated: rated.length,
    total: items.length,
    counts: Array.from({ length: levels }, (_, n) => rated.filter(s => s === n).length),
    worst: rated.length ? Math.max(...rated) : null,
  };
}

export const toEntry = (ev: Evaluation, levels = 5): ListEntry => ({
  id: ev.id, name: ev.name, site: ev.site, evaluator: ev.evaluator, date: ev.date,
  summary: summarize(ev.items, levels),
});

export const wordCount = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

export function fmtDate(iso: string) {
  if (!iso) return "No date";
  const d = new Date(iso + "T00:00:00");
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Typed helper for CSS custom properties in inline styles. */
export const cssVars = (vars: Record<`--${string}`, string>) => vars as CSSProperties;

export const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = Object.assign(document.createElement("textarea"), { value: text });
    ta.style.cssText = "position:fixed;opacity:0;left:0;top:0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { /* blocked */ }
    ta.remove();
    return ok;
  }
}
