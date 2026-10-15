export interface Heuristic {
  title: string;
  description: string;
}

export interface Severity {
  level: number;
  name: string;
  description: string;
}

export interface Reference {
  heuristics: Heuristic[];
  severities: Severity[];
}

export type NoteField = "issues" | "recommendation";

export interface Item {
  heuristic: number;
  severity: number | null;
  issues: string;
  recommendation: string;
}

export interface Summary {
  rated: number;
  total: number;
  counts: number[];
  worst: number | null;
}

export const META_FIELDS = ["name", "evaluator", "date", "site", "device", "browser", "task"] as const;
export type MetaField = (typeof META_FIELDS)[number];

export interface Evaluation extends Record<MetaField, string> {
  id: number;
  created_at: string;
  updated_at: string;
  items: Item[];
  summary: Summary;
}

export interface ListEntry {
  id: number;
  name: string;
  site: string;
  evaluator: string;
  date: string;
  summary: Summary;
}
