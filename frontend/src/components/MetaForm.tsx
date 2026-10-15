import type { Evaluation, MetaField } from "../types";
import { AutoTextarea } from "./AutoTextarea";

const FIELDS: { key: Exclude<MetaField, "name" | "task">; label: string; type?: string }[] = [
  { key: "evaluator", label: "Evaluator" },
  { key: "date", label: "Date", type: "date" },
  { key: "site", label: "Website / App" },
  { key: "device", label: "Device" },
  { key: "browser", label: "Browser / OS" },
];

export function MetaForm({ ev, onChange }: { ev: Evaluation; onChange: (field: MetaField, value: string) => void }) {
  return (
    <section className="meta" aria-label="Session details">
      {FIELDS.map(f => (
        <label key={f.key} className="fld">
          <span>{f.label}</span>
          <input type={f.type ?? "text"} autoComplete="off" maxLength={300} value={ev[f.key]}
            onChange={e => onChange(f.key, e.target.value)} />
        </label>
      ))}
      <label className="fld wide">
        <span>Task / Feature</span>
        <AutoTextarea rows={1} maxLength={2000} value={ev.task} onChange={e => onChange("task", e.target.value)} />
      </label>
    </section>
  );
}
