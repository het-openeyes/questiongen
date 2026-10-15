/** Stacked bar of how many heuristics sit at each severity level. */
export function DistBar({ counts, className }: { counts: number[]; className: string }) {
  return (
    <div className={className} aria-hidden="true">
      {counts.map((c, n) => <i key={n} style={{ background: `var(--s${n})`, flexGrow: c }} />)}
    </div>
  );
}
